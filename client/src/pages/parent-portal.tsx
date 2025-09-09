import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { Users, ArrowLeft, Calendar, CheckCircle, XCircle, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { parentPortalSchema, type ParentPortalRequest } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface AttendanceResult {
  student: {
    name: string;
    admissionNo: string;
    className: string;
    section: string;
  };
  attendance: {
    percentage: number;
    presentDays: number;
    absentDays: number;
    totalDays: number;
  };
}

export default function ParentPortalPage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceResult | null>(null);
  const [error, setError] = useState<string>('');

  const form = useForm<ParentPortalRequest>({
    resolver: zodResolver(parentPortalSchema),
    defaultValues: {
      admissionNo: '',
    },
  });

  const checkAttendanceMutation = useMutation({
    mutationFn: (data: ParentPortalRequest) => apiRequest('POST', '/api/parent-portal', data),
    onSuccess: async (response) => {
      const result = await response.json();
      setAttendanceData(result);
      setError('');
    },
    onError: (error: any) => {
      setError(error.message.includes('not found') ? 'Student not found. Please check the admission number.' : 'Failed to fetch attendance data.');
      setAttendanceData(null);
    },
  });

  const onSubmit = (data: ParentPortalRequest) => {
    checkAttendanceMutation.mutate(data);
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 90) return { status: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' };
    if (percentage >= 75) return { status: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (percentage >= 60) return { status: 'Average', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { status: 'Poor', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const getCurrentMonth = () => {
    return new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Parent Portal</CardTitle>
          <p className="text-muted-foreground">Check your child's attendance</p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <FormField
                control={form.control}
                name="admissionNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter admission number" 
                        data-testid="input-admission-number"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                disabled={checkAttendanceMutation.isPending}
                data-testid="button-check-attendance"
              >
                {checkAttendanceMutation.isPending ? 'Checking...' : 'Check Attendance'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" data-testid="link-back-to-login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
          
          {/* Attendance Results */}
          {attendanceData && (
            <div className="mt-6 space-y-4" data-testid="attendance-results">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg">
                <h3 className="text-lg font-bold text-center mb-2">
                  {attendanceData.student.name}
                </h3>
                <div className="text-center text-sm opacity-90">
                  <p>Class {attendanceData.student.className}-{attendanceData.student.section}</p>
                  <p>Admission No: {attendanceData.student.admissionNo}</p>
                </div>
              </div>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Attendance for {getCurrentMonth()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Attendance Percentage */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{attendanceData.attendance.percentage}%</div>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Badge 
                        className={`${getAttendanceStatus(attendanceData.attendance.percentage).color} text-white`}
                      >
                        {getAttendanceStatus(attendanceData.attendance.percentage).status}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Detailed Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-600">
                        {attendanceData.attendance.presentDays}
                      </p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                    
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-red-600">
                        {attendanceData.attendance.absentDays}
                      </p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                    
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-blue-600">
                        {attendanceData.attendance.totalDays}
                      </p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Attendance Progress</span>
                      <span className="font-medium">{attendanceData.attendance.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${getAttendanceStatus(attendanceData.attendance.percentage).color}`}
                        style={{ width: `${attendanceData.attendance.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Attendance Guidelines */}
                  <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <AlertDescription className="text-sm">
                      <strong>School Policy:</strong> Minimum 75% attendance required. 
                      {attendanceData.attendance.percentage < 75 && (
                        <span className="text-red-600 font-medium">
                          {' '}Your child's attendance is below the required minimum.
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <footer className="fixed bottom-4 left-0 right-0 text-center text-sm text-muted-foreground">
        <p>© APS FATHEGARH | version – v.25.1.0</p>
      </footer>
    </div>
  );
}
