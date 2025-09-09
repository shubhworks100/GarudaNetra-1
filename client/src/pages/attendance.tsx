import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Save, QrCode, Camera, ClipboardCheck, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Student, Attendance } from '@shared/schema';

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students', selectedClass],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedClass) params.append('className', selectedClass);
      return fetch(`/api/students?${params}`).then(res => res.json());
    },
  });

  const { data: existingAttendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', selectedDate, selectedClass],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedClass) params.append('className', selectedClass);
      return fetch(`/api/attendance?${params}`).then(res => res.json());
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecords: Array<{
      studentId: string;
      date: string;
      status: 'present' | 'absent' | 'late';
      method: 'manual';
    }>) => {
      const results = await Promise.all(
        attendanceRecords.map(record => apiRequest('POST', '/api/attendance', record))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({ title: 'Success', description: 'Attendance saved successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save attendance', variant: 'destructive' });
    },
  });

  // Initialize attendance data when existing attendance loads
  useEffect(() => {
    if (existingAttendance.length > 0) {
      const initialData: Record<string, 'present' | 'absent' | 'late'> = {};
      existingAttendance.forEach((record: Attendance) => {
        initialData[record.studentId] = record.status as 'present' | 'absent' | 'late';
      });
      setAttendanceData(initialData);
    }
  }, [existingAttendance]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = () => {
    const records = Object.entries(attendanceData).map(([studentId, status]) => ({
      studentId,
      date: selectedDate,
      status,
      method: 'manual' as const,
    }));

    if (records.length === 0) {
      toast({ title: 'Warning', description: 'No attendance data to save', variant: 'destructive' });
      return;
    }

    saveAttendanceMutation.mutate(records);
  };

  const getAttendanceStats = () => {
    const total = students.length;
    const marked = Object.keys(attendanceData).length;
    const present = Object.values(attendanceData).filter(status => status === 'present').length;
    const absent = Object.values(attendanceData).filter(status => status === 'absent').length;
    const late = Object.values(attendanceData).filter(status => status === 'late').length;
    
    return { total, marked, present, absent, late };
  };

  const stats = getAttendanceStats();

  if (studentsLoading || attendanceLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Mark Attendance</h2>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Mark Attendance</h2>
          <p className="text-muted-foreground">
            Date: {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            data-testid="input-attendance-date"
          />
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-48" data-testid="select-attendance-class">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Classes</SelectItem>
              <SelectItem value="12">Class 12</SelectItem>
              <SelectItem value="11">Class 11</SelectItem>
              <SelectItem value="10">Class 10</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleSaveAttendance}
            disabled={saveAttendanceMutation.isPending}
            data-testid="button-save-attendance"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center attendance-card" data-testid="card-qr-scanner">
          <CardContent className="p-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">QR Scanner</h3>
            <p className="text-muted-foreground text-sm mb-4">Scan student QR codes for quick attendance</p>
            <Link href="/qr-scanner">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Open Scanner
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="text-center attendance-card" data-testid="card-face-recognition">
          <CardContent className="p-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Face Recognition</h3>
            <p className="text-muted-foreground text-sm mb-4">AI-powered attendance marking</p>
            <Link href="/face-recognition">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Start Recognition
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="text-center attendance-card" data-testid="card-manual-entry">
          <CardContent className="p-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Manual Entry</h3>
            <p className="text-muted-foreground text-sm mb-4">Mark attendance manually below</p>
            <Badge variant="outline" className="text-green-600">
              Active Mode
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
            <p className="text-sm text-muted-foreground">Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.marked}</p>
            <p className="text-sm text-muted-foreground">Marked</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Grid */}
      {students.length > 0 ? (
        <Card data-testid="card-attendance-grid">
          <CardHeader>
            <CardTitle>
              {selectedClass ? `Class ${selectedClass}` : 'All Classes'} Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student: Student) => (
                <Card key={student.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar>
                        <AvatarImage src={student.photoUrl || undefined} />
                        <AvatarFallback>
                          {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Roll: {student.rollNo} | {student.className}-{student.section}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {student.admissionNo}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={attendanceData[student.id] === 'present' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAttendanceChange(student.id, 'present')}
                        data-testid={`button-present-${student.id}`}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Present
                      </Button>
                      <Button
                        variant={attendanceData[student.id] === 'absent' ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAttendanceChange(student.id, 'absent')}
                        data-testid={`button-absent-${student.id}`}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Absent
                      </Button>
                      <Button
                        variant={attendanceData[student.id] === 'late' ? 'secondary' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAttendanceChange(student.id, 'late')}
                        data-testid={`button-late-${student.id}`}
                      >
                        Late
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
            <p className="text-muted-foreground">
              {selectedClass 
                ? `No students found in Class ${selectedClass}` 
                : 'No students available. Add students first.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
