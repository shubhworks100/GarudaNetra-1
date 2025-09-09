import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertStudentSchema, insertAttendanceSchema, parentPortalSchema, bulkStudentSchema, reportGenerationSchema, faceRecognitionSchema, qrAttendanceSchema } from "@shared/schema";
import QRCode from "qrcode";
import multer from "multer";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, role } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password || user.role !== role) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In a real app, you'd use proper session management or JWT
      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  // Student management routes
  app.get("/api/students", async (req, res) => {
    try {
      const { className, section } = req.query;
      const students = await storage.getStudents({
        className: className as string,
        section: section as string,
      });
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid student data" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const updates = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(req.params.id, updates);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const success = await storage.deleteStudent(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Student not found" });
      }
      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete student" });
    }
  });

  // Bulk student upload
  app.post("/api/students/bulk-upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const students = bulkStudentSchema.parse(data);
      const createdStudents = await storage.bulkCreateStudents(students);
      
      res.json({
        message: `Successfully imported ${createdStudents.length} students`,
        students: createdStudents,
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to process file" });
    }
  });

  // Generate QR code for student
  app.get("/api/students/:id/qr", async (req, res) => {
    try {
      const student = await storage.getStudent(req.params.id);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const qrData = JSON.stringify({
        studentId: student.id,
        admissionNo: student.admissionNo,
        name: student.name,
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData);
      res.json({ qrCode: qrCodeDataUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const { date, className } = req.query;
      const attendanceRecords = await storage.getAttendanceByDate(
        date as string,
        className as string
      );
      res.json(attendanceRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.get("/api/attendance/stats", async (req, res) => {
    try {
      const { date, className } = req.query;
      const stats = await storage.getAttendanceStats(
        date as string,
        className as string
      );
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance stats" });
    }
  });

  app.get("/api/attendance/student/:studentId", async (req, res) => {
    try {
      const { from, to } = req.query;
      const dateRange = from && to ? { from: from as string, to: to as string } : undefined;
      
      const history = await storage.getAttendanceHistory(req.params.studentId, dateRange);
      const percentage = await storage.getStudentAttendancePercentage(req.params.studentId, dateRange);
      
      res.json({ history, percentage });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch student attendance" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  // QR code attendance marking
  app.post("/api/attendance/qr", async (req, res) => {
    try {
      const { qrData } = qrAttendanceSchema.parse(req.body);
      
      // Parse QR data
      const studentData = JSON.parse(qrData);
      const student = await storage.getStudent(studentData.studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Check if attendance already marked for today
      const today = new Date().toISOString().split('T')[0];
      const existingAttendance = await storage.getAttendance(student.id, today);
      
      if (existingAttendance) {
        return res.status(400).json({ message: "Attendance already marked for today" });
      }

      // Mark attendance
      const attendance = await storage.createAttendance({
        studentId: student.id,
        date: today,
        status: "present",
        method: "qr",
        markedBy: null, // In real app, get from session
      });

      res.json({
        message: "Attendance marked successfully",
        student: {
          name: student.name,
          admissionNo: student.admissionNo,
          className: student.className,
          section: student.section,
        },
        attendance,
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid QR code or failed to mark attendance" });
    }
  });

  // Face recognition attendance
  app.post("/api/attendance/face", async (req, res) => {
    try {
      const { studentId, imageData, confidence } = faceRecognitionSchema.parse(req.body);
      
      if (confidence < 80) {
        return res.status(400).json({ message: "Face recognition confidence too low" });
      }

      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Check if attendance already marked for today
      const today = new Date().toISOString().split('T')[0];
      const existingAttendance = await storage.getAttendance(student.id, today);
      
      if (existingAttendance) {
        return res.status(400).json({ message: "Attendance already marked for today" });
      }

      // Mark attendance
      const attendance = await storage.createAttendance({
        studentId: student.id,
        date: today,
        status: "present",
        method: "face",
        markedBy: null,
      });

      res.json({
        message: "Attendance marked via face recognition",
        student: {
          name: student.name,
          admissionNo: student.admissionNo,
          className: student.className,
          section: student.section,
        },
        attendance,
        confidence,
      });
    } catch (error) {
      res.status(400).json({ message: "Face recognition failed" });
    }
  });

  // Classes routes
  app.get("/api/classes", async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Parent portal route
  app.post("/api/parent-portal", async (req, res) => {
    try {
      const { admissionNo } = parentPortalSchema.parse(req.body);
      
      const student = await storage.getStudentByAdmissionNo(admissionNo);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get current month attendance
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const history = await storage.getAttendanceHistory(student.id, {
        from: startOfMonth,
        to: endOfMonth,
      });
      
      const percentage = await storage.getStudentAttendancePercentage(student.id, {
        from: startOfMonth,
        to: endOfMonth,
      });

      const presentDays = history.filter(h => h.status === 'present' || h.status === 'late').length;
      const absentDays = history.filter(h => h.status === 'absent').length;

      res.json({
        student: {
          name: student.name,
          admissionNo: student.admissionNo,
          className: student.className,
          section: student.section,
        },
        attendance: {
          percentage: Math.round(percentage),
          presentDays,
          absentDays,
          totalDays: history.length,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid admission number" });
    }
  });

  // Reports routes
  app.post("/api/reports/generate", async (req, res) => {
    try {
      const { type, dateRange, className, format } = reportGenerationSchema.parse(req.body);
      
      // Get students based on filters
      const students = await storage.getStudents(className ? { className } : undefined);
      
      // Get attendance data for the date range
      const reportData = [];
      for (const student of students) {
        const history = await storage.getAttendanceHistory(student.id, dateRange);
        const percentage = await storage.getStudentAttendancePercentage(student.id, dateRange);
        
        const presentDays = history.filter(h => h.status === 'present' || h.status === 'late').length;
        const absentDays = history.filter(h => h.status === 'absent').length;
        
        reportData.push({
          student,
          totalDays: history.length,
          presentDays,
          absentDays,
          percentage: Math.round(percentage),
        });
      }

      if (format === 'excel') {
        // Generate Excel file
        const ws = XLSX.utils.json_to_sheet(reportData.map(r => ({
          'Admission No': r.student.admissionNo,
          'Name': r.student.name,
          'Class': `${r.student.className}-${r.student.section}`,
          'Total Days': r.totalDays,
          'Present Days': r.presentDays,
          'Absent Days': r.absentDays,
          'Attendance %': r.percentage,
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.xlsx');
        res.send(buffer);
      } else if (format === 'csv') {
        // Generate CSV
        const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(reportData.map(r => ({
          'Admission No': r.student.admissionNo,
          'Name': r.student.name,
          'Class': `${r.student.className}-${r.student.section}`,
          'Total Days': r.totalDays,
          'Present Days': r.presentDays,
          'Absent Days': r.absentDays,
          'Attendance %': r.percentage,
        }))));
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
        res.send(csv);
      } else if (format === 'pdf') {
        // Generate PDF
        const doc = new PDFDocument();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
        
        doc.pipe(res);
        
        doc.fontSize(20).text('Attendance Report', 100, 100);
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 100, 130);
        doc.fontSize(12).text(`Date Range: ${dateRange.from} to ${dateRange.to}`, 100, 150);
        
        let yPosition = 200;
        doc.fontSize(10);
        
        // Headers
        doc.text('Admission No', 50, yPosition);
        doc.text('Name', 150, yPosition);
        doc.text('Class', 250, yPosition);
        doc.text('Present', 300, yPosition);
        doc.text('Absent', 350, yPosition);
        doc.text('Percentage', 400, yPosition);
        
        yPosition += 20;
        
        // Data rows
        for (const data of reportData) {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          doc.text(data.student.admissionNo, 50, yPosition);
          doc.text(data.student.name, 150, yPosition);
          doc.text(`${data.student.className}-${data.student.section}`, 250, yPosition);
          doc.text(data.presentDays.toString(), 300, yPosition);
          doc.text(data.absentDays.toString(), 350, yPosition);
          doc.text(`${data.percentage}%`, 400, yPosition);
          
          yPosition += 15;
        }
        
        doc.end();
      } else {
        res.json(reportData);
      }
    } catch (error) {
      res.status(400).json({ message: "Failed to generate report" });
    }
  });

  // Dashboard statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = await storage.getAttendanceStats(today);
      
      // Get class-wise stats
      const classes = await storage.getClasses();
      const classStats = [];
      
      for (const cls of classes) {
        const classAttendance = await storage.getAttendanceStats(today, cls.name);
        classStats.push({
          class: `${cls.name}-${cls.section}`,
          ...classAttendance,
        });
      }
      
      res.json({
        overall: stats,
        byClass: classStats,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
