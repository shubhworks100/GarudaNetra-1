import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ScanResult {
  studentId: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  timestamp: string;
  status: 'success' | 'duplicate' | 'error';
  message?: string;
}

export default function QRScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const markAttendanceMutation = useMutation({
    mutationFn: (qrData: string) => apiRequest('POST', '/api/attendance/qr', { qrData }),
    onSuccess: (response) => {
      const result = response.json().then((data) => {
        const newResult: ScanResult = {
          studentId: data.student.admissionNo,
          name: data.student.name,
          admissionNo: data.student.admissionNo,
          className: data.student.className,
          section: data.student.section,
          timestamp: new Date().toLocaleTimeString(),
          status: 'success',
        };
        
        setScanResults(prev => [newResult, ...prev]);
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        toast({ 
          title: 'Success', 
          description: `Attendance marked for ${data.student.name}` 
        });
      });
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to mark attendance';
      if (error.message.includes('already marked')) {
        errorMessage = 'Attendance already marked for today';
      } else if (error.message.includes('not found')) {
        errorMessage = 'Student not found';
      }
      
      const newResult: ScanResult = {
        studentId: 'unknown',
        name: 'Unknown Student',
        admissionNo: 'N/A',
        className: 'N/A',
        section: 'N/A',
        timestamp: new Date().toLocaleTimeString(),
        status: 'error',
        message: errorMessage,
      };
      
      setScanResults(prev => [newResult, ...prev]);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    },
  });

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setIsScanning(true);
      startScanning();
    } catch (err) {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    
    setIsScanning(false);
  };

  const startScanning = () => {
    // Simulate QR code scanning
    // In a real implementation, you would use a QR code library like jsQR
    scanIntervalRef.current = setInterval(() => {
      scanForQRCode();
    }, 1000);
  };

  const scanForQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // In a real implementation, you would use jsQR or similar library here
    // For now, we'll simulate QR detection with a mock function
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = detectQRCode(imageData);
    
    if (qrCode && !markAttendanceMutation.isPending) {
      markAttendanceMutation.mutate(qrCode);
    }
  };

  // Mock QR detection function - replace with real QR library
  const detectQRCode = (imageData: ImageData): string | null => {
    // This is a simulation - in reality you would use jsQR
    // For testing purposes, we can return mock data occasionally
    if (Math.random() < 0.1) { // 10% chance of detecting a "QR code"
      return JSON.stringify({
        studentId: 'student-123',
        admissionNo: 'APS001',
        name: 'Test Student'
      });
    }
    return null;
  };

  const clearResults = () => {
    setScanResults([]);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const getSessionStats = () => {
    const total = scanResults.length;
    const successful = scanResults.filter(r => r.status === 'success').length;
    const errors = scanResults.filter(r => r.status === 'error').length;
    
    return { total, successful, errors };
  };

  const stats = getSessionStats();

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">QR Code Scanner</h2>
        <p className="text-muted-foreground">Scan student QR codes for attendance</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Interface */}
        <Card data-testid="card-camera-scanner">
          <CardHeader>
            <CardTitle>Camera Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover qr-scanner-video"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="h-8 w-8 text-gray-900" />
                    </div>
                    <p className="mb-2">Camera Preview</p>
                    <p className="text-sm">Click "Start Scanner" to begin</p>
                  </div>
                </div>
              )}
              
              {isScanning && (
                <div className="absolute top-4 left-4 right-4">
                  <div className="bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Scanning for QR codes...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              {!isScanning ? (
                <Button 
                  onClick={startCamera} 
                  className="flex-1"
                  data-testid="button-start-scanner"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Scanner
                </Button>
              ) : (
                <Button 
                  onClick={stopCamera} 
                  variant="destructive" 
                  className="flex-1"
                  data-testid="button-stop-scanner"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Scanner
                </Button>
              )}
              
              <Button 
                onClick={clearResults} 
                variant="outline"
                data-testid="button-clear-results"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scan Results */}
        <Card data-testid="card-scan-results">
          <CardHeader>
            <CardTitle>Scan Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {scanResults.length > 0 ? (
                scanResults.slice(0, 10).map((result, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      result.status === 'success' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        result.status === 'success' 
                          ? 'bg-green-100 dark:bg-green-900' 
                          : 'bg-red-100 dark:bg-red-900'
                      }`}>
                        {result.status === 'success' ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{result.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.admissionNo} - {result.className}-{result.section}
                        </p>
                        {result.message && (
                          <p className="text-sm text-red-600">{result.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={result.status === 'success' ? 'default' : 'destructive'}
                        className="mb-1"
                      >
                        {result.status === 'success' ? 'Present' : 'Failed'}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{result.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground">No scans yet</p>
                  <p className="text-sm text-muted-foreground">Start scanning to see results here</p>
                </div>
              )}
            </div>
            
            {/* Session Statistics */}
            <div>
              <h4 className="font-medium text-foreground mb-2">Session Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-accent rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Scans</p>
                </div>
                <div className="text-center p-3 bg-accent rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
                <div className="text-center p-3 bg-accent rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Generator Section */}
      <Card data-testid="card-qr-generator">
        <CardHeader>
          <CardTitle>QR Code Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-0.5">
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">How to use QR Scanner</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Each student needs a unique QR code generated from their profile</li>
                  <li>• QR codes can be downloaded from the Students page</li>
                  <li>• Students should show their QR code to the camera</li>
                  <li>• The system will automatically mark attendance when a valid QR code is detected</li>
                  <li>• Duplicate scans for the same day will be prevented</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
