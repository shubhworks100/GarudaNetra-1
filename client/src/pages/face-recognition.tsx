import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Upload, Camera, UserCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Student } from '@shared/schema';

interface RecognitionResult {
  studentId: string;
  name: string;
  admissionNo: string;
  className: string;
  section: string;
  confidence: number;
  timestamp: string;
  status: 'recognized' | 'confirmed' | 'rejected';
}

export default function FaceRecognitionPage() {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [detectionMode, setDetectionMode] = useState('real-time');
  const [autoMarkAttendance, setAutoMarkAttendance] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (data: { studentId: string; imageData: string; confidence: number }) =>
      apiRequest('POST', '/api/attendance/face', data),
    onSuccess: (response) => {
      response.json().then((data) => {
        toast({ 
          title: 'Success', 
          description: `Attendance marked for ${data.student.name} (${data.confidence}% confidence)` 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to mark attendance', 
        variant: 'destructive' 
      });
    },
  });

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Use front camera for face recognition
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setIsRecognizing(true);
      if (detectionMode === 'real-time') {
        startFaceDetection();
      }
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: 'Failed to access camera. Please ensure camera permissions are granted.',
        variant: 'destructive'
      });
      console.error('Camera access error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecognizing(false);
  };

  const startFaceDetection = () => {
    // Simulate face detection and recognition
    // In a real implementation, you would use face-api.js or similar library
    const interval = setInterval(() => {
      if (!isRecognizing) {
        clearInterval(interval);
        return;
      }
      
      detectAndRecognizeFace();
    }, 2000); // Check every 2 seconds
  };

  const detectAndRecognizeFace = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Simulate face detection and recognition
    const mockRecognition = simulateFaceRecognition();
    
    if (mockRecognition && mockRecognition.confidence >= confidenceThreshold) {
      const newResult: RecognitionResult = {
        ...mockRecognition,
        timestamp: new Date().toLocaleTimeString(),
        status: 'recognized',
      };
      
      setRecognitionResults(prev => [newResult, ...prev.slice(0, 9)]);
      
      if (autoMarkAttendance) {
        confirmAttendance(newResult);
      }
    }
  };

  // Mock face recognition function - replace with real face recognition library
  const simulateFaceRecognition = (): Omit<RecognitionResult, 'timestamp' | 'status'> | null => {
    // This is a simulation - in reality you would use face-api.js
    if (Math.random() < 0.3 && (students as any[]).length > 0) { // 30% chance of recognizing a face
      const randomStudent = (students as any[])[(Math.floor(Math.random() * (students as any[]).length))];
      const confidence = Math.floor(Math.random() * (95 - confidenceThreshold) + confidenceThreshold);
      
      return {
        studentId: randomStudent.id,
        name: randomStudent.name,
        admissionNo: randomStudent.admissionNo,
        className: randomStudent.className,
        section: randomStudent.section,
        confidence,
      };
    }
    return null;
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Simulate face recognition on captured image
    const mockRecognition = simulateFaceRecognition();
    
    if (mockRecognition && mockRecognition.confidence >= confidenceThreshold) {
      const newResult: RecognitionResult = {
        ...mockRecognition,
        timestamp: new Date().toLocaleTimeString(),
        status: 'recognized',
      };
      
      setRecognitionResults(prev => [newResult, ...prev]);
      
      if (autoMarkAttendance) {
        markAttendanceMutation.mutate({
          studentId: mockRecognition.studentId,
          imageData,
          confidence: mockRecognition.confidence,
        });
      }
    } else {
      toast({ 
        title: 'No Face Recognized', 
        description: 'No matching face found or confidence too low',
        variant: 'destructive'
      });
    }
  };

  const confirmAttendance = (result: RecognitionResult) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Capture current frame
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    markAttendanceMutation.mutate({
      studentId: result.studentId,
      imageData,
      confidence: result.confidence,
    });
    
    // Update result status
    setRecognitionResults(prev => 
      prev.map(r => r === result ? { ...r, status: 'confirmed' } : r)
    );
  };

  const rejectRecognition = (result: RecognitionResult) => {
    setRecognitionResults(prev => 
      prev.map(r => r === result ? { ...r, status: 'rejected' } : r)
    );
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingPhotos(true);
    
    try {
      // In a real implementation, you would upload these photos to train the face recognition model
      // For now, we'll just simulate the upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({ 
        title: 'Success', 
        description: `${files.length} reference photos uploaded successfully` 
      });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to upload reference photos',
        variant: 'destructive'
      });
    } finally {
      setUploadingPhotos(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const getRecognitionStats = () => {
    const total = recognitionResults.length;
    const confirmed = recognitionResults.filter(r => r.status === 'confirmed').length;
    const pending = recognitionResults.filter(r => r.status === 'recognized').length;
    
    return { total, confirmed, pending };
  };

  const stats = getRecognitionStats();

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Face Recognition</h2>
        <p className="text-muted-foreground">AI-powered attendance using facial recognition</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Interface */}
        <Card data-testid="card-camera-interface">
          <CardHeader>
            <CardTitle>Live Camera Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isRecognizing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                  <div className="text-center text-white">
                    <Camera className="h-12 w-12 mx-auto mb-4" />
                    <p className="mb-2">Camera Preview</p>
                    <p className="text-sm">Click "Start Recognition" to begin</p>
                  </div>
                </div>
              )}
              
              {isRecognizing && (
                <>
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-black/70 text-white text-sm px-3 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Face detection active</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Simulated face detection overlay */}
                  <div className="absolute top-16 left-16 w-16 h-16 border-2 border-green-400 rounded-lg face-detection-overlay"></div>
                </>
              )}
            </div>
            
            <div className="flex space-x-3">
              {!isRecognizing ? (
                <Button 
                  onClick={startCamera} 
                  className="flex-1"
                  data-testid="button-start-recognition"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Recognition
                </Button>
              ) : (
                <Button 
                  onClick={stopCamera} 
                  variant="destructive" 
                  className="flex-1"
                  data-testid="button-stop-recognition"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recognition
                </Button>
              )}
              
              <Button 
                onClick={captureImage} 
                variant="secondary"
                disabled={!isRecognizing}
                data-testid="button-capture"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recognition Results */}
        <Card data-testid="card-recognition-results">
          <CardHeader>
            <CardTitle>Recognition Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {recognitionResults.length > 0 ? (
                recognitionResults.slice(0, 5).map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 border rounded-lg ${
                      result.status === 'confirmed' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                        : result.status === 'rejected'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                        : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {result.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{result.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {result.admissionNo} - {result.className}-{result.section}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {result.confidence}% confidence
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {result.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {result.status === 'recognized' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => confirmAttendance(result)}
                            disabled={markAttendanceMutation.isPending}
                            data-testid={`button-confirm-${index}`}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectRecognition(result)}
                            data-testid={`button-reject-${index}`}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {result.status === 'confirmed' && (
                        <Badge className="bg-green-500">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      )}
                      
                      {result.status === 'rejected' && (
                        <Badge variant="destructive">
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recognitions yet</p>
                  <p className="text-sm text-muted-foreground">Start face recognition to see results here</p>
                </div>
              )}
            </div>
            
            {/* Session Statistics */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Session Statistics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-accent rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Detected</p>
                </div>
                <div className="text-center p-3 bg-accent rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                </div>
                <div className="text-center p-3 bg-accent rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reference Photos Upload */}
      <Card data-testid="card-photo-upload">
        <CardHeader>
          <CardTitle>Reference Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Upload student reference photos</p>
            <p className="text-sm text-muted-foreground mb-4">
              Multiple photos per student improve recognition accuracy
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhotos}
              data-testid="button-upload-photos"
            >
              {uploadingPhotos ? 'Uploading...' : 'Choose Files'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Face Recognition Settings */}
      <Card data-testid="card-recognition-settings">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Recognition Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">
                Confidence Threshold: {confidenceThreshold}%
              </Label>
              <Slider
                value={[confidenceThreshold]}
                onValueChange={(value) => setConfidenceThreshold(value[0])}
                min={50}
                max={100}
                step={5}
                className="w-full"
                data-testid="slider-confidence"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">Detection Mode</Label>
              <Select value={detectionMode} onValueChange={setDetectionMode}>
                <SelectTrigger data-testid="select-detection-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real-time">Real-time</SelectItem>
                  <SelectItem value="manual">Manual capture</SelectItem>
                  <SelectItem value="batch">Batch processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">Auto-mark attendance</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  checked={autoMarkAttendance}
                  onCheckedChange={setAutoMarkAttendance}
                  data-testid="switch-auto-mark"
                />
                <span className="text-sm text-foreground">Enable auto-marking</span>
              </div>
            </div>
          </div>
          
          <Alert className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> This is a simulation of face recognition technology. 
              In a real implementation, you would integrate with face-api.js or similar libraries 
              and train models with actual student photos for accurate recognition.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
