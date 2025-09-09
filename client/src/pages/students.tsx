import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Upload, Edit, Trash2, QrCode, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertStudentSchema, type InsertStudent, type Student } from '@shared/schema';

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['/api/students', selectedClass],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedClass) params.append('className', selectedClass);
      return fetch(`/api/students?${params}`).then(res => res.json());
    },
  });

  const addStudentMutation = useMutation({
    mutationFn: (data: InsertStudent) => apiRequest('POST', '/api/students', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setIsAddDialogOpen(false);
      toast({ title: 'Success', description: 'Student added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add student', variant: 'destructive' });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertStudent> }) =>
      apiRequest('PUT', `/api/students/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setEditingStudent(null);
      toast({ title: 'Success', description: 'Student updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update student', variant: 'destructive' });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({ title: 'Success', description: 'Student deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete student', variant: 'destructive' });
    },
  });

  const form = useForm<InsertStudent>({
    resolver: zodResolver(insertStudentSchema),
    defaultValues: {
      admissionNo: '',
      name: '',
      className: '',
      section: '',
      rollNo: '',
      email: '',
      contactNo: '',
      parentContact: '',
      photoUrl: null,
      faceDescriptor: null,
    },
  });

  const filteredStudents = students.filter((student: Student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.admissionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const onSubmit = (data: InsertStudent) => {
    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, data });
    } else {
      addStudentMutation.mutate(data);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    form.reset({
      admissionNo: student.admissionNo,
      name: student.name,
      className: student.className,
      section: student.section,
      rollNo: student.rollNo,
      email: student.email || '',
      contactNo: student.contactNo || '',
      parentContact: student.parentContact || '',
      photoUrl: student.photoUrl,
      faceDescriptor: student.faceDescriptor || null,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      deleteStudentMutation.mutate(id);
    }
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/students/bulk-upload', {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(result => {
        if (result.students) {
          queryClient.invalidateQueries({ queryKey: ['/api/students'] });
          toast({ title: 'Success', description: result.message });
        } else {
          throw new Error(result.message);
        }
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to upload students', variant: 'destructive' });
      });

    // Reset file input
    event.target.value = '';
  };

  const generateQR = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}/qr`);
      const data = await response.json();
      
      // Create a download link for the QR code
      const link = document.createElement('a');
      link.href = data.qrCode;
      link.download = `qr-code-${studentId}.png`;
      link.click();
      
      toast({ title: 'Success', description: 'QR code generated and downloaded' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate QR code', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Student Management</h2>
            <p className="text-muted-foreground">Manage student records and information</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Student Management</h2>
          <p className="text-muted-foreground">Manage student records and information</p>
        </div>
        <div className="flex space-x-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleBulkUpload}
            className="hidden"
            id="bulk-upload"
          />
          <label htmlFor="bulk-upload">
            <Button variant="secondary" className="cursor-pointer" data-testid="button-bulk-upload">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
          </label>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-student">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="admissionNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admission No.</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter admission number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter student name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="className"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rollNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll No.</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter roll number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact No.</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact number" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parentContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter parent contact" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setEditingStudent(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addStudentMutation.isPending}>
                      {addStudentMutation.isPending ? 'Adding...' : 'Add Student'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, admission no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-students"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger data-testid="select-class-filter">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="12">Class 12</SelectItem>
                <SelectItem value="11">Class 11</SelectItem>
                <SelectItem value="10">Class 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Student Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student: Student) => (
                  <TableRow key={student.id} className="hover-elevate">
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={student.photoUrl || undefined} />
                        <AvatarFallback>
                          {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.admissionNo}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.className}-{student.section}</TableCell>
                    <TableCell>{student.rollNo}</TableCell>
                    <TableCell>{student.contactNo || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
                          data-testid={`button-edit-${student.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(student.id)}
                          data-testid={`button-delete-${student.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateQR(student.id)}
                          data-testid={`button-qr-${student.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredStudents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No students found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="admissionNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admission No.</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter admission number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="className"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rollNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Roll No.</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter roll number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact No.</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parentContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter parent contact" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStudentMutation.isPending}>
                  {updateStudentMutation.isPending ? 'Updating...' : 'Update Student'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
