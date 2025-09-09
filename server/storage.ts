import { type User, type InsertUser, type Student, type InsertStudent, type Attendance, type InsertAttendance, type Class, type InsertClass, type AttendanceReport } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Students
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByAdmissionNo(admissionNo: string): Promise<Student | undefined>;
  getStudents(filters?: { className?: string; section?: string }): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, updates: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;
  bulkCreateStudents(students: InsertStudent[]): Promise<Student[]>;
  
  // Attendance
  getAttendance(studentId: string, date: string): Promise<Attendance | undefined>;
  getAttendanceByDate(date: string, className?: string): Promise<Attendance[]>;
  getAttendanceHistory(studentId: string, dateRange?: { from: string; to: string }): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, updates: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  
  // Classes
  getClasses(): Promise<Class[]>;
  getClassesByTeacher(teacherId: string): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  
  // Reports
  saveReport(report: Omit<AttendanceReport, 'id' | 'createdAt'>): Promise<AttendanceReport>;
  getReports(userId?: string): Promise<AttendanceReport[]>;
  
  // Statistics
  getAttendanceStats(date: string, className?: string): Promise<{
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  }>;
  
  getStudentAttendancePercentage(studentId: string, dateRange?: { from: string; to: string }): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private students: Map<string, Student> = new Map();
  private attendance: Map<string, Attendance> = new Map();
  private classes: Map<string, Class> = new Map();
  private reports: Map<string, AttendanceReport> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create default admin user
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      password: "admin123", // In real app, this would be hashed
      role: "admin",
      name: "System Administrator",
      email: "admin@aps.edu",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create default teacher
    const teacherUser: User = {
      id: randomUUID(),
      username: "teacher",
      password: "teacher123",
      role: "teacher",
      name: "John Teacher",
      email: "teacher@aps.edu",
      createdAt: new Date(),
    };
    this.users.set(teacherUser.id, teacherUser);

    // Create sample classes
    const class12A: Class = {
      id: randomUUID(),
      name: "12",
      section: "A",
      teacherId: teacherUser.id,
      createdAt: new Date(),
    };
    this.classes.set(class12A.id, class12A);

    // Create sample students
    const sampleStudents: Student[] = [
      {
        id: randomUUID(),
        admissionNo: "APS001",
        name: "Aarav Sharma",
        className: "12",
        section: "A",
        rollNo: "01",
        email: "aarav.sharma@student.aps.edu",
        contactNo: "9876543210",
        parentContact: "9876543211",
        photoUrl: null,
        qrCode: "QR_APS001",
        faceDescriptor: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        admissionNo: "APS002",
        name: "Priya Patel",
        className: "12",
        section: "A",
        rollNo: "02",
        email: "priya.patel@student.aps.edu",
        contactNo: "9876543212",
        parentContact: "9876543213",
        photoUrl: null,
        qrCode: "QR_APS002",
        faceDescriptor: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        admissionNo: "APS003",
        name: "Rahul Kumar",
        className: "12",
        section: "B",
        rollNo: "01",
        email: "rahul.kumar@student.aps.edu",
        contactNo: "9876543214",
        parentContact: "9876543215",
        photoUrl: null,
        qrCode: "QR_APS003",
        faceDescriptor: null,
        createdAt: new Date(),
      },
    ];

    sampleStudents.forEach(student => {
      this.students.set(student.id, student);
    });

    // Create sample attendance for today
    const today = new Date().toISOString().split('T')[0];
    sampleStudents.slice(0, 2).forEach(student => {
      const attendanceRecord: Attendance = {
        id: randomUUID(),
        studentId: student.id,
        date: today,
        status: "present",
        method: "manual",
        timestamp: new Date(),
        markedBy: teacherUser.id,
      };
      this.attendance.set(attendanceRecord.id, attendanceRecord);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      createdAt: new Date(),
      email: insertUser.email ?? null,
    };
    this.users.set(user.id, user);
    return user;
  }

  // Student methods
  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByAdmissionNo(admissionNo: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(student => student.admissionNo === admissionNo);
  }

  async getStudents(filters?: { className?: string; section?: string }): Promise<Student[]> {
    let students = Array.from(this.students.values());
    
    if (filters?.className) {
      students = students.filter(s => s.className === filters.className);
    }
    
    if (filters?.section) {
      students = students.filter(s => s.section === filters.section);
    }
    
    return students.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const student: Student = {
      ...insertStudent,
      id: randomUUID(),
      qrCode: `QR_${insertStudent.admissionNo}`,
      createdAt: new Date(),
      email: insertStudent.email || null,
      contactNo: insertStudent.contactNo || null,
      parentContact: insertStudent.parentContact || null,
    };
    this.students.set(student.id, student);
    return student;
  }

  async updateStudent(id: string, updates: Partial<InsertStudent>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;
    
    const updatedStudent = { ...student, ...updates };
    this.students.set(id, updatedStudent);
    return updatedStudent;
  }

  async deleteStudent(id: string): Promise<boolean> {
    return this.students.delete(id);
  }

  async bulkCreateStudents(insertStudents: InsertStudent[]): Promise<Student[]> {
    const students: Student[] = [];
    
    for (const insertStudent of insertStudents) {
      const student = await this.createStudent(insertStudent);
      students.push(student);
    }
    
    return students;
  }

  // Attendance methods
  async getAttendance(studentId: string, date: string): Promise<Attendance | undefined> {
    return Array.from(this.attendance.values()).find(
      a => a.studentId === studentId && a.date === date
    );
  }

  async getAttendanceByDate(date: string, className?: string): Promise<Attendance[]> {
    let attendanceRecords = Array.from(this.attendance.values()).filter(a => a.date === date);
    
    if (className) {
      const studentsInClass = Array.from(this.students.values()).filter(s => s.className === className);
      const studentIds = new Set(studentsInClass.map(s => s.id));
      attendanceRecords = attendanceRecords.filter(a => studentIds.has(a.studentId));
    }
    
    return attendanceRecords;
  }

  async getAttendanceHistory(studentId: string, dateRange?: { from: string; to: string }): Promise<Attendance[]> {
    let records = Array.from(this.attendance.values()).filter(a => a.studentId === studentId);
    
    if (dateRange) {
      records = records.filter(a => a.date >= dateRange.from && a.date <= dateRange.to);
    }
    
    return records.sort((a, b) => b.date.localeCompare(a.date));
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const attendance: Attendance = {
      ...insertAttendance,
      id: randomUUID(),
      timestamp: new Date(),
      method: insertAttendance.method || null,
      markedBy: insertAttendance.markedBy || null,
    };
    this.attendance.set(attendance.id, attendance);
    return attendance;
  }

  async updateAttendance(id: string, updates: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;
    
    const updatedAttendance = { ...attendance, ...updates };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  // Class methods
  async getClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    return Array.from(this.classes.values()).filter(c => c.teacherId === teacherId);
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    const classData: Class = {
      ...insertClass,
      id: randomUUID(),
      createdAt: new Date(),
      teacherId: insertClass.teacherId || null,
    };
    this.classes.set(classData.id, classData);
    return classData;
  }

  // Report methods
  async saveReport(reportData: Omit<AttendanceReport, 'id' | 'createdAt'>): Promise<AttendanceReport> {
    const report: AttendanceReport = {
      ...reportData,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.reports.set(report.id, report);
    return report;
  }

  async getReports(userId?: string): Promise<AttendanceReport[]> {
    let reports = Array.from(this.reports.values());
    
    if (userId) {
      reports = reports.filter(r => r.createdBy === userId);
    }
    
    return reports.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Statistics methods
  async getAttendanceStats(date: string, className?: string): Promise<{
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  }> {
    const students = await this.getStudents(className ? { className } : undefined);
    const attendanceRecords = await this.getAttendanceByDate(date, className);
    
    const totalStudents = students.length;
    const present = attendanceRecords.filter(a => a.status === 'present').length;
    const absent = attendanceRecords.filter(a => a.status === 'absent').length;
    const late = attendanceRecords.filter(a => a.status === 'late').length;
    
    // Count students without attendance records as absent
    const unmarked = totalStudents - attendanceRecords.length;
    const totalAbsent = absent + unmarked;
    
    const attendanceRate = totalStudents > 0 ? (present / totalStudents) * 100 : 0;
    
    return {
      totalStudents,
      present,
      absent: totalAbsent,
      late,
      attendanceRate,
    };
  }

  async getStudentAttendancePercentage(studentId: string, dateRange?: { from: string; to: string }): Promise<number> {
    const records = await this.getAttendanceHistory(studentId, dateRange);
    
    if (records.length === 0) return 0;
    
    const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return (presentDays / records.length) * 100;
  }
}

export const storage = new MemStorage();
