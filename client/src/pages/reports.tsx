import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Calendar, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AttendanceChart } from '@/components/attendance-chart';
import { useToast } from '@/hooks/use-toast';
import type { Student, Attendance } from '@shared/schema';

interface ReportData {
  student: Student;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('last-30-days');
  const [selectedClass, setSelectedClass] = useState('');
  const [reportType, setReportType] = useState('student-wise');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const { toast } = useToast();

  // Get date range based on selection
  const getDateRange = () => {
    const today = new Date();
    let from, to;

    switch (dateRange) {
      case 'last-7-days':
        from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        to = today;
        break;
      case 'last-30-days':
        from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = today;
        break;
      case 'this-month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = today;
        break;
      case 'custom':
        from = customDateFrom ? new Date(customDateFrom) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = customDateTo ? new Date(customDateTo) : today;
        break;
      default:
        from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        to = today;
    }

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  };

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students', selectedClass],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedClass) params.append('className', selectedClass);
      return fetch(`/api/students?${params}`).then(res => res.json());
    },
  });

  // Mock report data - in a real app, this would come from the API
  const reportData: ReportData[] = students.map((student: Student) => {
    // Simulate attendance data
    const totalDays = Math.floor(Math.random() * 25) + 15; // 15-40 days
    const presentDays = Math.floor(totalDays * (0.7 + Math.random() * 0.25)); // 70-95% attendance
    const absentDays = totalDays - presentDays;
    const percentage = Math.round((presentDays / totalDays) * 100);

    return {
      student,
      totalDays,
      presentDays,
      absentDays,
      percentage,
    };
  });

  const generateReport = async (format: 'excel' | 'csv' | 'pdf') => {
    try {
      const range = getDateRange();
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: reportType,
          dateRange: range,
          className: selectedClass || undefined,
          format,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Handle file download
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `attendance-report.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Success', description: `${format.toUpperCase()} report downloaded successfully` });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to generate report', 
        variant: 'destructive' 
      });
    }
  };

  const getOverallStats = () => {
    if (reportData.length === 0) return { avgAttendance: 0, totalStudents: 0, bestClass: 'N/A' };

    const avgAttendance = reportData.reduce((sum, data) => sum + data.percentage, 0) / reportData.length;
    const totalStudents = reportData.length;
    
    // Group by class and find best performing
    const classStats = reportData.reduce((acc, data) => {
      const classKey = `${data.student.className}-${data.student.section}`;
      if (!acc[classKey]) {
        acc[classKey] = { total: 0, count: 0 };
      }
      acc[classKey].total += data.percentage;
      acc[classKey].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const bestClass = Object.entries(classStats)
      .map(([className, stats]) => ({
        className,
        average: stats.total / stats.count,
      }))
      .sort((a, b) => b.average - a.average)[0]?.className || 'N/A';

    return {
      avgAttendance: Math.round(avgAttendance),
      totalStudents,
      bestClass,
    };
  };

  const stats = getOverallStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Attendance Reports</h2>
          <p className="text-muted-foreground">Generate and export attendance reports</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => generateReport('excel')}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            onClick={() => generateReport('csv')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={() => generateReport('pdf')}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-export-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Report Filters */}
      <Card data-testid="card-report-filters">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger data-testid="select-class">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
                  <SelectItem value="12">Class 12</SelectItem>
                  <SelectItem value="11">Class 11</SelectItem>
                  <SelectItem value="10">Class 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                  <SelectItem value="student-wise">Student-wise</SelectItem>
                  <SelectItem value="class-wise">Class-wise</SelectItem>
                  <SelectItem value="absentee">Absentee Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                className="w-full"
                onClick={() => {
                  // Trigger report generation - this would typically refresh the data
                  toast({ title: 'Report Generated', description: 'Report data updated successfully' });
                }}
                data-testid="button-generate-report"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
          
          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">From Date</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="input-date-from"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">To Date</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  data-testid="input-date-to"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Summary Chart */}
        <AttendanceChart 
          title="Attendance Trends" 
          type="line"
          data-testid="chart-attendance-trends"
        />

        {/* Quick Statistics */}
        <Card data-testid="card-quick-stats">
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-foreground">Average Attendance</span>
                </div>
                <span className="font-bold text-green-600">{stats.avgAttendance}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="text-foreground">Total Students</span>
                </div>
                <span className="font-bold text-blue-600">{stats.totalStudents}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <span className="text-foreground">Best Performing Class</span>
                </div>
                <span className="font-bold text-purple-600">{stats.bestClass}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <span className="text-foreground">Report Period</span>
                </div>
                <span className="font-bold text-orange-600">
                  {dateRange === 'custom' && customDateFrom && customDateTo
                    ? `${customDateFrom} to ${customDateTo}`
                    : dateRange.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card data-testid="card-detailed-report">
        <CardHeader>
          <CardTitle>Detailed Report</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((data) => (
                    <TableRow key={data.student.id} className="hover-elevate">
                      <TableCell className="font-medium">{data.student.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{data.student.admissionNo}</Badge>
                      </TableCell>
                      <TableCell>{data.student.className}-{data.student.section}</TableCell>
                      <TableCell>{data.totalDays}</TableCell>
                      <TableCell className="text-green-600 font-medium">{data.presentDays}</TableCell>
                      <TableCell className="text-red-600 font-medium">{data.absentDays}</TableCell>
                      <TableCell className="font-medium">{data.percentage}%</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            data.percentage >= 90 ? 'default' :
                            data.percentage >= 75 ? 'secondary' : 'destructive'
                          }
                        >
                          {data.percentage >= 90 ? 'Excellent' :
                           data.percentage >= 75 ? 'Good' : 'Poor'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                {selectedClass 
                  ? `No attendance data found for Class ${selectedClass}` 
                  : 'No attendance data available for the selected period'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
