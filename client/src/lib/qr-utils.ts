// QR Code utilities for GarudaNetra attendance system

export interface QRData {
  studentId: string;
  admissionNo: string;
  name: string;
  className?: string;
  section?: string;
  timestamp?: string;
}

/**
 * Parse QR code data string into structured format
 */
export function parseQRData(qrString: string): QRData | null {
  try {
    const data = JSON.parse(qrString);
    
    // Validate required fields
    if (!data.studentId || !data.admissionNo || !data.name) {
      throw new Error('Invalid QR data: missing required fields');
    }
    
    return {
      studentId: data.studentId,
      admissionNo: data.admissionNo,
      name: data.name,
      className: data.className,
      section: data.section,
      timestamp: data.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to parse QR data:', error);
    return null;
  }
}

/**
 * Generate QR data string from student information
 */
export function generateQRData(student: {
  id: string;
  admissionNo: string;
  name: string;
  className?: string;
  section?: string;
}): string {
  const qrData: QRData = {
    studentId: student.id,
    admissionNo: student.admissionNo,
    name: student.name,
    className: student.className,
    section: student.section,
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(qrData);
}

/**
 * Validate QR code format
 */
export function isValidQRFormat(qrString: string): boolean {
  const data = parseQRData(qrString);
  return data !== null;
}

/**
 * Extract admission number from QR data
 */
export function getAdmissionNoFromQR(qrString: string): string | null {
  const data = parseQRData(qrString);
  return data ? data.admissionNo : null;
}

/**
 * Check if QR code is expired (optional feature)
 */
export function isQRExpired(qrString: string, maxAgeHours: number = 24): boolean {
  const data = parseQRData(qrString);
  if (!data || !data.timestamp) return false;
  
  const qrTime = new Date(data.timestamp).getTime();
  const currentTime = new Date().getTime();
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
  
  return (currentTime - qrTime) > maxAge;
}

/**
 * Generate QR code display name
 */
export function getQRDisplayName(qrString: string): string {
  const data = parseQRData(qrString);
  if (!data) return 'Unknown';
  
  const classInfo = data.className && data.section 
    ? ` (${data.className}-${data.section})` 
    : '';
    
  return `${data.name}${classInfo}`;
}

/**
 * Sanitize QR data for security
 */
export function sanitizeQRData(qrString: string): string | null {
  const data = parseQRData(qrString);
  if (!data) return null;
  
  // Remove any potentially harmful content and re-stringify
  const sanitized: QRData = {
    studentId: data.studentId.replace(/[<>\"'&]/g, ''),
    admissionNo: data.admissionNo.replace(/[<>\"'&]/g, ''),
    name: data.name.replace(/[<>\"'&]/g, ''),
    className: data.className?.replace(/[<>\"'&]/g, ''),
    section: data.section?.replace(/[<>\"'&]/g, ''),
    timestamp: data.timestamp,
  };
  
  return JSON.stringify(sanitized);
}

/**
 * Generate sample QR data for testing
 */
export function generateSampleQRData(): string {
  const sampleData: QRData = {
    studentId: 'sample-student-id',
    admissionNo: 'APS001',
    name: 'Sample Student',
    className: '12',
    section: 'A',
    timestamp: new Date().toISOString(),
  };
  
  return JSON.stringify(sampleData);
}
