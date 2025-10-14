export class TestUtils {
  static generateTestPhone(): string {
    // Format: +7 (country code) + 10 digits
    // Regex: /^(\+?\d{1,3}[- ]?)?\d{10}$/
    const random = Math.floor(Math.random() * 10000000000);
    const phone = `+7${random.toString().padStart(10, '0')}`;
    return phone;
  }

  static generateTestDeviceToken(): string {
    const random = Math.random().toString(36).substring(2, 15);
    return `test-device-token-${random}`;
  }

  static generateTestUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static generateTestEmail(): string {
    const random = Math.random().toString(36).substring(2, 15);
    return `test-${random}@example.com`;
  }

  static generateTestName(): string {
    const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
    return names[Math.floor(Math.random() * names.length)];
  }

  static generateTestAddress(): string {
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Cedar Ln'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    return `${number} ${street}`;
  }

  static generateTestCoordinates(): { lat: number; lng: number } {
    // Generate coordinates around Almaty, Kazakhstan
    const lat = 43.2220 + (Math.random() - 0.5) * 0.1;
    const lng = 76.8512 + (Math.random() - 0.5) * 0.1;
    return { lat, lng };
  }

  static generateTestPrice(): number {
    return Math.floor(Math.random() * 5000) + 500; // 500-5500 tenge
  }

  static generateTestRating(): number {
    return Math.floor(Math.random() * 5) + 1; // 1-5 stars
  }

  static generateTestComment(): string {
    const comments = [
      'Great service!',
      'Fast and reliable',
      'Excellent driver',
      'Very professional',
      'Highly recommended',
      'Smooth ride',
      'Friendly driver',
      'Clean car',
      'On time',
      'Perfect service'
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  static generateTestOrderType(): number {
    return Math.floor(Math.random() * 4) + 1; // 1-4 order types
  }

  static generateTestOrderStatus(): string {
    const statuses = ['CREATED', 'STARTED', 'WAITING', 'ONGOING', 'COMPLETED', 'REJECTED_BY_CLIENT', 'REJECTED_BY_DRIVER'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  static generateTestDate(): Date {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * 30) - 15; // -15 to +15 days
    return new Date(now.getTime() + randomDays * 24 * 60 * 60 * 1000);
  }

  static generateTestFutureDate(): Date {
    const now = new Date();
    const randomHours = Math.floor(Math.random() * 24) + 1; // 1-24 hours
    return new Date(now.getTime() + randomHours * 60 * 60 * 1000);
  }

  static generateTestPastDate(): Date {
    const now = new Date();
    const randomHours = Math.floor(Math.random() * 24) + 1; // 1-24 hours ago
    return new Date(now.getTime() - randomHours * 60 * 60 * 1000);
  }
}
