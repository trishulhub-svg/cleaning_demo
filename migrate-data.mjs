import { createClient } from '@libsql/client';

const DB_URL = 'libsql://greenleafdb-kiran2057.aws-eu-west-1.turso.io';
const DB_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDc2NDk2MTcuOTUzNTQyLCJleHAiOjE4MzE2MTY4MTcuOTUzNDIsImlzcyI6InR1cnNvIiwic3ViIjoiZTliYzNhMmUtZjNmNi00Mzc5LTlhYjctZDk2NGIzOGMxNDM4IiwiZGJOb3JtYWxOYW1lIjoiZ3JlZW5sZWFmZGIta2lyYW4yMDU3In0.CM05pKYJ-GUmx6oKBNXsnVKBFLPXQy_3T_WrF_8oXQYQUHmkdzPmXOAd5_8mzF5TjWnJkTZ7DdhX0c7sfEMMCw';

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

async function run() {
  console.log('Starting data migration to Turso...');

  // ============ ADMINS ============
  console.log('Inserting admins...');
  await db.execute(`
    INSERT OR IGNORE INTO Admin (id, email, password, name, role, createdBy, createdAt, updatedAt) VALUES
    (1, 'super@greenleaf.com', '$2y$10$wm7gujE/UQKfA8BPdyaqweIxkdUaZ54b.wmHA2BQJVR27DUKEBH6y', 'Super Administrator', 'super_admin', NULL, '2026-04-28 16:02:31', '2026-04-30 07:04:56'),
    (2, 'admin@greenleaf.com', '$2y$10$suk0YaufIgXHThDhqHQPaeGRDBZjqwiMLx3L8AANMm1uTjUhTl5pq', 'Admin', 'admin', NULL, '2026-04-29 06:16:21', NULL)
  `);

  // ============ USERS (skip id=1 which is duplicate admin) ============
  console.log('Inserting users...');
  await db.execute(`
    INSERT OR IGNORE INTO User (id, name, email, phone, password, address, role, emailVerified, phoneVerified, createdAt) VALUES
    (6, 'Nisha Ramtel', 'nisharamtel663@gmail.com', NULL, '$2y$10$FEWxDPPKS.rcxBWrrxNr8.g7unN6N77f5s8YYmAZ4mW/Q9oHg3Z4C', NULL, 'customer', 0, 0, '2026-04-02 17:09:55'),
    (7, 'Taroon patel', 'trishulhub@gmail.com', NULL, '$2y$10$7vSm8pmjerdkdX1IR1rQvOojdefOKlRD1znEDvAiEdVZVVtiYAdGa', NULL, 'customer', 0, 0, '2026-04-13 12:58:59'),
    (8, 'Kiran Pradhan', 'kiranpradhan2057@gmail.com', '+44 782 456 2148', '$2y$10$e6R6lZtDt/f46K/FHadfX.mSFgVcPRSCxby48UUjIm4G3N3cmivYO', NULL, 'customer', 1, 0, '2026-04-14 16:16:55'),
    (9, 'Nitu Ramtel', 'ramtelneetu@gmail.com', '9804357171', '$2y$10$DEDmyRP/.mkVH1tpFphr4eF5NuAFYrSJX28eO91AmeprPQOSxGP/i', NULL, 'customer', 1, 0, '2026-05-07 20:58:50')
  `);

  // ============ STAFF ============
  console.log('Inserting staff...');
  await db.execute(`
    INSERT OR IGNORE INTO Staff (id, name, email, phone, password, role, isActive, createdAt, updatedAt, tempPassword, mustChangePassword) VALUES
    (2, 'Sarah Supervisor', 'sarah@greenleaf.com', '+447234567890', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'supervisor', 1, '2026-04-14 21:07:19', NULL, NULL, 1),
    (5, 'nisha shrestha', 'kiranpradhan2057@gmail.com', '07824536729', NULL, 'cleaner', 1, '2026-04-17 12:30:10', NULL, '$2y$10$d7ItPj9fjkR3IzmoSVBqHO7reeUVR1BdrRNTK8L6o5822Jsc24DL2', 1),
    (8, 'new employee', 'kidanpradhan1111@gmail.com', '07824536729', '$2y$10$Qawqk5frPTYSW.usYUDa5u3SR4iilcfh8cYFMtFVFPJRtwp9bN1KO', 'cleaner', 1, '2026-04-21 22:13:20', '2026-04-21 22:15:34', NULL, 0)
  `);

  // ============ SERVICES ============
  console.log('Inserting services...');
  await db.execute(`
    INSERT OR IGNORE INTO Service (id, name, description, price, packageType, bedroomsMin, bedroomsMax, bathroomsMin, bathroomsMax, durationHours, features, isFeatured, isActive, sortOrder) VALUES
    (1, 'Standard Cleaning', 'Basic cleaning service for homes up to 3 bedrooms. Includes dusting, vacuuming, mopping, and bathroom cleaning.', 100.00, 'standard', 1, 2, 1, 2, 2, 'Dust all surfaces,Vacuum carpets & floors,Mop hard floors,Clean bathrooms,Kitchen surfaces,Empty trash,Make beds', 1, 1, 1),
    (2, 'Deep Cleaning', 'Intensive cleaning including inside appliances, windows, baseboards, and hard-to-reach areas. Perfect for spring cleaning.', 200.00, 'premium', 3, 4, 2, 3, 4, 'All standard cleaning,Deep clean bathrooms,Inside oven,Inside fridge,Baseboards,Windowsills,Under furniture', 1, 1, 2),
    (4, 'Move-In/Move-Out Cleaning', 'Complete cleaning for moving transitions. Ensures your space is spotless for the next occupant or landlord inspection.', 250.00, 'premium', 1, 5, 1, 4, 6, 'Full deep clean,Inside all appliances,Cabinets inside,Windows,Wall washing,Floor polishing', 1, 1, 3),
    (5, 'One-Time Cleaning', 'Single cleaning session for special occasions, parties, or when you need extra help without a recurring schedule.', 120.00, 'standard', 1, 2, 1, 2, 2, NULL, 0, 1, 4)
  `);

  // ============ FAQS ============
  console.log('Inserting FAQs...');
  await db.execute(`
    INSERT OR IGNORE INTO Faq (id, question, answer, category, sortOrder, isActive, createdAt) VALUES
    (1, 'Do I need to be home during cleaning?', 'No, you don''t need to be home. Many of our customers leave a key or use a key safe. We''re fully insured and all staff are DBS-checked for your peace of mind.', 'General', 1, 1, '2026-04-16 22:08:05'),
    (2, 'What if I''m not satisfied with the cleaning?', 'We offer a 100% satisfaction guarantee. If you''re not happy, contact us within 24 hours and we''ll re-clean for free or refund your money.', 'General', 2, 1, '2026-04-16 22:08:05'),
    (3, 'How do I pay for the service?', 'We accept cash, credit/debit cards, Apple Pay, Google Pay, and bank transfers. Payment is collected after the service is completed. You can also pay online in advance for a 5% discount.', 'General', 3, 1, '2026-04-16 22:08:05'),
    (4, 'What''s your cancellation policy?', 'Free cancellation up to 24 hours before your appointment. 50% charge for 12-24 hours notice. Full charge for less than 12 hours notice.', 'Booking', 1, 1, '2026-04-16 22:08:05'),
    (5, 'Do you bring cleaning supplies?', 'Yes! We bring all professional-grade equipment and eco-friendly cleaning products. If you prefer specific products, just let us know.', 'Booking', 2, 1, '2026-04-16 22:08:05'),
    (6, 'Can I reschedule my booking?', 'Yes, you can reschedule free of charge up to 24 hours before your appointment. Just contact us or login to your account to reschedule.', 'Booking', 3, 1, '2026-04-16 22:08:05'),
    (7, 'Are your cleaning products safe for pets and children?', 'Yes! We use 100% eco-friendly, non-toxic cleaning products that are safe for pets, children, and the environment.', 'Services', 1, 1, '2026-04-16 22:08:05'),
    (8, 'Do you offer same-day or emergency cleaning?', 'Yes! Same-day service is available subject to availability. There''s a £50 surcharge for same-day bookings. Call us at +44 20 1234 5678.', 'Services', 2, 1, '2026-04-16 22:08:05'),
    (9, 'What areas do you cover?', 'We clean across London including Central, North, South, East, and West London. Enter your postcode during booking to confirm we serve your area.', 'Services', 3, 1, '2026-04-16 22:08:05'),
    (10, 'Do you offer discounts for regular cleaning?', 'Yes! Save 20% on weekly cleaning, 15% on bi-weekly, and 10% on monthly cleaning. You can also save 5% by paying online in advance.', 'Pricing', 1, 1, '2026-04-16 22:08:05'),
    (11, 'Is there a minimum booking time?', 'Yes, our minimum booking is 2 hours. Most standard cleanings take 2-4 hours depending on the size of your property.', 'Pricing', 2, 1, '2026-04-16 22:08:05'),
    (12, 'What payment methods do you accept?', 'We accept cash, all major credit/debit cards, Apple Pay, Google Pay, and bank transfers. Online payments are processed securely via Stripe.', 'Pricing', 3, 1, '2026-04-16 22:08:05')
  `);

  // ============ BOOKINGS ============
  console.log('Inserting bookings...');
  await db.execute(`
    INSERT OR IGNORE INTO Booking (id, userId, guestName, guestEmail, guestPhone, serviceId, bookingDate, bookingTime, address, accessNotes, totalPrice, paymentStatus, paymentMethod, bookingStatus, assignedStaffId, qrCompletionCode, qrScannedAt, cancelledAt, cancellationReason, cancellationType, refundStatus, invoiceId, createdAt, updatedAt) VALUES
    (25, 6, NULL, NULL, NULL, 4, '2026-04-17', '17:00:00', 'HOUNSLOW', NULL, 237.50, 'paid', 'stripe', 'completed', 8, 'QR-20260427-8EF86D13AE', NULL, NULL, NULL, 'none', NULL, 11, '2026-04-02 17:10:36', NULL),
    (26, 6, NULL, NULL, NULL, 4, '2026-04-25', '13:00:00', 'kjdkdsa', NULL, 237.50, 'paid', 'stripe', 'pending', 4, NULL, NULL, NULL, NULL, 'none', NULL, 12, '2026-04-02 17:54:12', NULL),
    (27, 6, NULL, NULL, NULL, 2, '2026-04-11', '10:00:00', 'd', NULL, 200.00, 'cash_on_service', 'cash_on_service', 'completed', 8, 'QR-20260427-55E4346CD3', NULL, NULL, 'kjadklgjlkajlsdjfkljasldfa', 'customer', 'none', NULL, '2026-04-02 17:57:38', NULL),
    (28, 6, NULL, NULL, NULL, 1, '2026-04-07', '16:00:00', 'lkjk', NULL, 95.00, 'paid', 'stripe', 'completed', 8, 'QR-20260422-7745D5B871', NULL, NULL, NULL, 'none', NULL, 13, '2026-04-02 18:03:12', '2026-04-06 07:15:48'),
    (29, 6, NULL, NULL, NULL, 5, '2026-04-26', '12:00:00', 'asdf', NULL, 114.00, 'paid', 'stripe', 'cancelled', 4, NULL, NULL, '2026-04-07 06:40:39', 'i am out onthis day', 'customer', 'auto_refund', NULL, 14, '2026-04-02 18:15:05', NULL),
    (30, 6, NULL, NULL, NULL, 4, '2026-04-06', '15:00:00', 'KLJKLLK', NULL, 237.50, 'paid', 'stripe', 'pending', 2, NULL, NULL, NULL, NULL, 'none', NULL, 15, '2026-04-02 20:57:53', '2026-04-06 07:06:11'),
    (31, 6, NULL, NULL, NULL, 5, '2026-05-02', '11:00:00', 'lkl;k', NULL, 114.00, 'paid', 'stripe', 'cancelled', 8, 'QR-20260428-DE0FCF800D', NULL, '2026-04-04 08:52:13', 'lkajsdflkjafjlkasldfajfals', 'customer', 'auto_refund', NULL, 16, '2026-04-02 21:04:40', NULL),
    (32, 6, NULL, NULL, NULL, 5, '2026-04-08', '17:00:00', 'hounslow', NULL, 120.00, 'cash_on_service', 'cash_on_service', 'cancelled', 5, NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-07 06:42:00', NULL),
    (33, 7, NULL, NULL, NULL, 2, '2026-04-17', '12:00:00', '11', NULL, 190.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, 17, '2026-04-13 13:02:40', NULL),
    (34, NULL, 'Kiran Pradhan', 'kiranpradhan2057@gmail.com', '+44 782 456 2148', 4, '2026-04-26', '17:00:00', 'Helen Avenue', NULL, 250.00, 'cash_on_service', 'cash_on_service', 'pending', 8, 'QR-20260507-BE4FCDDB73', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-14 15:06:01', NULL),
    (35, 6, NULL, NULL, NULL, 2, '2026-04-25', '15:00:00', 'NEPLA', NULL, 190.00, 'pending', 'cash_on_service', 'cancelled', 4, 'QR-20260421-6C392D8E9E', NULL, '2026-04-20 22:49:48', 'KLLLKJL;KJKLJLJLJLK', 'customer', 'none', NULL, NULL, '2026-04-18 23:56:41', NULL),
    (36, 6, NULL, NULL, NULL, 2, '2026-04-25', '15:00:00', 'NEPLA', NULL, 190.00, 'pending', 'cash_on_service', 'pending', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-18 23:57:34', NULL),
    (37, 6, NULL, NULL, NULL, 2, '2026-04-25', '15:00:00', 'NEPLA', NULL, 190.00, 'pending', 'cash_on_service', 'pending', 4, 'QR-20260421-26B873753D', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 00:07:35', NULL),
    (38, 6, NULL, NULL, NULL, 2, '2026-04-24', '15:00:00', 'adsf', NULL, 190.00, 'pending', 'cash_on_service', 'completed', 4, 'QR-20260421-516E4DD9C2', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 00:08:00', NULL),
    (39, 6, NULL, NULL, NULL, 2, '2026-04-30', '15:00:00', 'afdg', NULL, 190.00, 'pending', 'cash_on_service', 'completed', 8, 'QR-20260427-3C3AADA740', '2026-05-16 07:59:54', NULL, NULL, 'none', NULL, NULL, '2026-04-19 00:20:15', NULL),
    (40, 8, NULL, NULL, NULL, 2, '2026-04-30', '10:00:00', 'adsf', NULL, 200.00, 'cash_on_service', 'cash_on_service', 'completed', 8, 'QR-20260427-ED4535050B', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 07:47:56', NULL),
    (41, 8, NULL, NULL, NULL, 2, '2026-04-24', '10:00:00', ',m,x', NULL, 190.00, 'pending', 'cash_on_service', 'completed', 8, 'QR-20260427-96708B8DAE', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 08:11:58', NULL),
    (42, 8, NULL, NULL, NULL, 2, '2026-04-24', '10:00:00', ',m,x', NULL, 190.00, 'pending', 'cash_on_service', 'completed', 8, 'QR-20260502-B5CB876753', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 08:13:47', NULL),
    (43, 8, NULL, NULL, NULL, 4, '2026-04-24', '17:00:00', 'l;kll', NULL, 237.50, 'pending', 'cash_on_service', 'pending', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 08:14:18', NULL),
    (44, 6, NULL, NULL, NULL, 4, '2026-04-24', '11:00:00', 'KJHKJ', NULL, 237.50, 'paid', 'stripe', 'completed', 8, 'QR-20260428-B23DFB6D33', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-19 08:37:33', NULL),
    (45, 6, NULL, NULL, NULL, 4, '2026-04-24', '11:00:00', 'KJHKJ', NULL, 237.50, 'pending', 'cash_on_service', 'cancelled', 4, 'QR-20260421-F8B6765983', NULL, '2026-04-20 22:48:52', 'ADFJJALSDFADSF', 'customer', 'none', NULL, NULL, '2026-04-19 08:38:25', NULL),
    (46, 6, NULL, NULL, NULL, 1, '2026-04-25', '16:00:00', 'ilam', NULL, 95.00, 'pending', 'cash_on_service', 'pending', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-20 06:45:08', NULL),
    (47, 6, NULL, NULL, NULL, 1, '2026-04-26', '14:00:00', 'nkjkjl', NULL, 95.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-20 23:19:45', NULL),
    (48, 6, NULL, NULL, NULL, 1, '2026-04-26', '14:00:00', 'nkjkjl', NULL, 95.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-20 23:24:44', NULL),
    (49, 6, NULL, NULL, NULL, 4, '2026-05-02', '13:00:00', 'nepla', NULL, 237.50, 'paid', 'stripe', 'confirmed', 8, 'QR-20260428-C556F96F87', NULL, NULL, NULL, 'none', NULL, NULL, '2026-04-27 22:42:00', NULL),
    (50, 6, NULL, NULL, NULL, 2, '2026-05-31', '13:00:00', 'nepal', NULL, 200.00, 'cash_on_service', 'cash_on_service', 'cancelled', 8, 'QR-20260503-8D37089BAA', NULL, '2026-05-03 08:17:14', 'mistakely booked', 'customer', 'none', NULL, NULL, '2026-05-03 08:04:52', NULL),
    (51, 6, NULL, NULL, NULL, 2, '2026-05-31', '13:00:00', 'nepal', NULL, 190.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-03 08:06:03', NULL),
    (52, 6, NULL, NULL, NULL, 1, '2026-05-31', '10:00:00', 'kadf;a', NULL, 100.00, 'cash_on_service', 'cash_on_service', 'cancelled', NULL, NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-03 08:27:59', NULL),
    (53, 6, NULL, NULL, NULL, 4, '2026-05-31', '10:00:00', 'kajnfafasd', NULL, 237.50, 'paid', 'stripe', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-04 08:46:22', NULL),
    (54, 6, NULL, NULL, NULL, 1, '2026-06-01', '14:00:00', 'kljaskdlfa', NULL, 95.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-04 08:58:30', NULL),
    (55, 6, NULL, NULL, NULL, 2, '2026-05-30', '15:00:00', 'kjasdfa', NULL, 190.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-04 09:16:40', NULL),
    (56, 6, NULL, NULL, NULL, 2, '2026-06-07', '12:00:00', 'kasdfa', NULL, 190.00, 'paid', 'stripe', 'confirmed', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-04 09:32:58', NULL),
    (57, 6, NULL, NULL, NULL, 4, '2026-05-31', '17:00:00', 'nepal', NULL, 237.50, 'paid', 'stripe', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-05 07:23:08', NULL),
    (58, 6, NULL, NULL, NULL, 5, '2026-05-29', '17:00:00', 'kanyam', NULL, 114.00, 'paid', 'stripe', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-05 07:40:06', NULL),
    (60, 6, NULL, NULL, NULL, 2, '2026-05-08', '10:00:00', 'kanyam', NULL, 200.00, 'cash_on_service', 'cash_on_service', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-05 07:59:31', NULL),
    (61, 6, NULL, NULL, NULL, 2, '2026-05-31', '17:00:00', 'ilam', NULL, 200.00, 'cash_on_service', 'cash_on_service', 'cancelled', 8, 'QR-20260507-08F92AFB7E', NULL, '2026-05-07 20:18:45', NULL, 'none', 'none', NULL, NULL, '2026-05-07 20:11:29', NULL),
    (62, 9, NULL, NULL, NULL, 1, '2026-05-31', '17:00:00', 'preston', NULL, 100.00, 'cash_on_service', 'cash_on_service', 'completed', 8, 'QR-20260508-1A35DD3E51', NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-07 22:15:09', NULL),
    (63, 6, NULL, NULL, NULL, 5, '2026-06-01', '10:00:00', 'london', NULL, 120.00, 'paid', 'stripe', 'completed', 8, 'QR-20260508-DF2F5C1A59', NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-07 22:30:31', NULL),
    (64, 6, NULL, NULL, NULL, 5, '2026-06-04', '17:00:00', 'ilam', NULL, 120.00, 'paid', 'stripe', 'completed', 8, 'QR-20260510-1015B8185D', NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-10 08:01:34', NULL),
    (65, 6, NULL, NULL, NULL, 1, '2026-06-04', '13:00:00', 'nepal', NULL, 95.00, 'paid', 'stripe', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-13 17:22:41', NULL),
    (66, 6, NULL, NULL, NULL, 1, '2026-06-04', '13:00:00', 'ilam', NULL, 100.00, 'cash_on_service', 'cash_on_service', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-13 17:24:00', NULL),
    (67, 6, NULL, NULL, NULL, 4, '2026-06-04', '09:00:00', '58 Bell Road, Hounslow, Greater London, United Kingdom', 'ring the doorbell', 250.00, 'paid', 'cash_on_service', 'completed', 8, 'QR-20260516-E114939839', '2026-05-16 08:51:10', NULL, NULL, 'none', NULL, NULL, '2026-05-16 07:25:56', NULL),
    (68, 6, NULL, NULL, NULL, 1, '2026-06-04', '10:00:00', '58 Bell Road, hounslow, Greater London, United Kingdom', NULL, 95.00, 'paid', 'stripe', 'cancelled', NULL, NULL, NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-16 07:27:16', NULL),
    (69, 6, NULL, NULL, NULL, 1, '2026-06-04', '10:00:00', '8 Viola Avenue, Feltham, Greater London, United Kingdom', 'please ring the bell and knock the door', 95.00, 'paid', 'stripe', 'confirmed', 8, 'QR-20260516-25BE2004C4', NULL, NULL, NULL, 'none', NULL, NULL, '2026-05-16 07:44:29', NULL)
  `);

  // ============ INVOICES (booking_id fixed for invoices 11-17) ============
  console.log('Inserting invoices...');
  await db.execute(`
    INSERT OR IGNORE INTO Invoice (id, userId, bookingId, invoiceNumber, totalAmount, paymentMethod, paymentStatus, createdAt, updatedAt) VALUES
    (11, 6, 25, 'INV-20260402-8B9A76', 237.50, 'stripe', 'paid', '2026-04-02 17:10:49', NULL),
    (12, 6, 26, 'INV-20260402-BF04D3', 237.50, 'stripe', 'paid', '2026-04-02 17:54:20', NULL),
    (13, 6, 28, 'INV-20260402-EC7EEA', 95.00, 'stripe', 'paid', '2026-04-02 18:03:22', NULL),
    (14, 6, 29, 'INV-20260402-1F8938', 114.00, 'stripe', 'paid', '2026-04-02 18:15:23', NULL),
    (15, 6, 30, 'INV-20260402-55F6FE', 237.50, 'stripe', 'paid', '2026-04-02 20:57:59', NULL),
    (16, 6, 31, 'INV-20260402-78AE40', 114.00, 'stripe', 'paid', '2026-04-02 21:04:52', NULL),
    (17, 7, 33, 'INV-20260413-0842D4', 190.00, 'stripe', 'paid', '2026-04-13 13:03:24', NULL),
    (18, 6, 56, 'INV-20260504-A7A984A7', 190.00, 'stripe', 'paid', '2026-05-04 09:32:58', NULL),
    (19, 6, 57, 'INV-20260505-F15B3586', 237.50, 'stripe', 'paid', '2026-05-05 07:23:08', NULL),
    (20, 6, 58, 'INV-20260505-8E05C2D6', 114.00, 'stripe', 'paid', '2026-05-05 07:40:06', NULL),
    (22, 6, 60, 'INV-20260505-49433D1A', 200.00, 'cash_on_service', 'pending', '2026-05-05 07:59:31', NULL),
    (23, 6, 61, 'INV-20260507-B4B7AC50', 200.00, 'cash_on_service', 'pending', '2026-05-07 20:11:29', NULL),
    (24, 9, 62, 'INV-20260508-D873B8B2', 100.00, 'cash_on_service', 'pending', '2026-05-07 22:15:09', NULL),
    (25, 6, 63, 'INV-20260508-A7D162EF', 120.00, 'cash_on_service', 'pending', '2026-05-07 22:30:31', NULL),
    (26, 6, 64, 'INV-20260510-B6A61BDD', 120.00, 'cash_on_service', 'pending', '2026-05-10 08:01:34', NULL),
    (27, 6, 64, 'INV-20260510-000064', 120.00, 'cash_on_service', 'paid', '2026-05-10 20:57:53', NULL),
    (28, 6, 65, 'INV-20260513-E428511B', 95.00, 'stripe', 'refunded', '2026-05-13 17:22:41', NULL),
    (29, 6, 66, 'INV-20260513-7E4A9624', 100.00, 'cash_on_service', 'pending', '2026-05-13 17:24:00', NULL),
    (30, 6, 44, 'INV-20260516-000044', 237.50, 'cash_on_service', 'paid', '2026-05-16 06:26:27', NULL),
    (31, 6, 67, 'INV-20260516-9E12B7A2', 250.00, 'cash_on_service', 'pending', '2026-05-16 07:25:56', NULL),
    (32, 6, 68, 'INV-20260516-3B501745', 95.00, 'stripe', 'refunded', '2026-05-16 07:27:16', NULL),
    (33, 6, 69, 'INV-20260516-950370B8', 95.00, 'stripe', 'paid', '2026-05-16 07:44:29', NULL),
    (34, 6, 63, 'INV-20260516-000063', 120.00, 'cash_on_service', 'paid', '2026-05-16 08:18:30', NULL),
    (35, 6, 67, 'INV-20260516-000067', 250.00, 'cash_on_service', 'paid', '2026-05-16 08:18:38', NULL)
  `);

  // ============ PAYMENTS (booking_id fixed for payments 2-8) ============
  console.log('Inserting payments...');
  await db.execute(`
    INSERT OR IGNORE INTO Payment (id, userId, bookingId, invoiceId, amount, paymentMethod, transactionId, paymentStatus, paidAt, createdAt) VALUES
    (2, 6, 25, 11, 237.50, 'stripe', 'pi_3THolwFDZkFuh02N1rwkLHql', 'completed', '2026-04-02 17:11:18', '2026-04-02 17:11:18'),
    (3, 6, 26, 12, 237.50, 'stripe', 'pi_3THpS2FDZkFuh02N0VEc8CnR', 'completed', '2026-04-02 17:54:49', '2026-04-02 17:54:49'),
    (4, 6, 28, 13, 95.00, 'stripe', 'pi_3THpaiFDZkFuh02N00Uwef1N', 'completed', '2026-04-02 18:03:46', '2026-04-02 18:03:46'),
    (5, 6, 29, 14, 114.00, 'stripe', 'pi_3THpmcFDZkFuh02N1PRdXXYo', 'completed', '2026-04-02 18:16:05', '2026-04-02 18:16:05'),
    (6, 6, 30, 15, 237.50, 'stripe', 'pi_3THsJoFDZkFuh02N0onlg1IX', 'completed', '2026-04-02 20:58:31', '2026-04-02 20:58:31'),
    (7, 6, 31, 16, 114.00, 'stripe', 'pi_3THsQPFDZkFuh02N16lYAK2v', 'completed', '2026-04-02 21:05:20', '2026-04-02 21:05:20'),
    (8, 7, 33, 17, 190.00, 'stripe', 'pi_3TLk9GFDZkFuh02N1JiNHqqo', 'completed', '2026-04-13 13:03:59', '2026-04-13 13:03:59'),
    (9, 6, 56, 18, 190.00, 'stripe', 'pi_3TTIrmFDZkFuh02N1YjpZUwA', 'completed', '2026-05-04 09:32:58', '2026-05-04 09:32:58'),
    (10, 6, 57, 19, 237.50, 'stripe', 'pi_3TTdJeFDZkFuh02N0TlTgESw', 'completed', '2026-05-05 07:23:08', '2026-05-05 07:23:08'),
    (11, 6, 58, 20, 114.00, 'stripe', 'pi_3TTda4FDZkFuh02N1AwTIcdX', 'completed', '2026-05-05 07:40:06', '2026-05-05 07:40:06'),
    (12, 6, 60, 22, 200.00, 'cash_on_service', 'CASH-1777967971-60', 'pending', NULL, '2026-05-05 07:59:31'),
    (13, 6, 61, 23, 200.00, 'cash_on_service', 'CASH-1778184689-61', 'pending', NULL, '2026-05-07 20:11:29'),
    (14, 9, 62, 24, 100.00, 'cash_on_service', 'CASH-1778192109-62', 'pending', NULL, '2026-05-07 22:15:09'),
    (15, 6, 63, 25, 120.00, 'cash_on_service', 'CASH-1778193031-63', 'pending', NULL, '2026-05-07 22:30:31'),
    (16, 6, 64, 26, 120.00, 'cash_on_service', 'CASH-1778400094-64', 'pending', NULL, '2026-05-10 08:01:34'),
    (17, 6, 64, 27, 120.00, 'cash_on_service', 'CASH-1778446673-64', 'completed', '2026-05-10 20:57:53', '2026-05-10 20:57:53'),
    (18, 6, 65, 28, 95.00, 'stripe', 'pi_3TWgUGFDZkFuh02N0vOL9Lgj', 'completed', '2026-05-13 17:22:41', '2026-05-13 17:22:41'),
    (19, 6, 66, 29, 100.00, 'cash_on_service', 'CASH-1778693040-66', 'pending', NULL, '2026-05-13 17:24:00'),
    (20, 6, 44, 30, 237.50, 'cash_on_service', 'CASH-1778912787-44', 'completed', '2026-05-16 06:26:27', '2026-05-16 06:26:27'),
    (21, 6, 67, 31, 250.00, 'cash_on_service', 'CASH-1778916356-67', 'pending', NULL, '2026-05-16 07:25:56'),
    (22, 6, 68, 32, 95.00, 'stripe', 'pi_3TXccuFDZkFuh02N0pUH7b5n', 'completed', '2026-05-16 07:27:16', '2026-05-16 07:27:16'),
    (23, 6, 69, 33, 95.00, 'stripe', 'pi_3TXctZFDZkFuh02N1H0UsEE8', 'completed', '2026-05-16 07:44:29', '2026-05-16 07:44:29'),
    (24, 6, 63, 34, 120.00, 'cash_on_service', 'CASH-1778919510-63', 'completed', '2026-05-16 08:18:30', '2026-05-16 08:18:30'),
    (25, 6, 67, 35, 250.00, 'cash_on_service', 'CASH-1778919518-67', 'completed', '2026-05-16 08:18:38', '2026-05-16 08:18:38')
  `);

  // ============ BOOKING ASSIGNMENTS ============
  console.log('Inserting booking assignments...');
  await db.execute(`
    INSERT OR IGNORE INTO BookingAssignment (id, bookingId, staffId, assignedBy, status, qrCode, notes, assignedAt, startedAt, completedAt) VALUES
    (1, 30, 2, 1, 'assigned', 'QR-20260416-72FB47ED', 'first one', '2026-04-16 13:58:50', NULL, NULL),
    (3, 32, 5, 1, 'assigned', 'QR-20260419-FFCD33F2', 'you dont need fob key', '2026-04-18 22:36:07', NULL, NULL),
    (17, 28, 8, 1, 'completed', 'QR-20260422-7745D5B871', '', '2026-04-22 09:39:20', NULL, '2026-04-22 09:43:11'),
    (18, 27, 8, 1, 'completed', 'QR-20260427-55E4346CD3', '', '2026-04-27 07:39:34', NULL, '2026-04-27 08:20:25'),
    (19, 41, 8, 1, 'completed', 'QR-20260427-96708B8DAE', '', '2026-04-27 07:45:39', NULL, '2026-04-27 07:46:31'),
    (20, 40, 8, 1, 'completed', 'QR-20260427-ED4535050B', '', '2026-04-27 08:19:23', NULL, '2026-04-27 08:24:02'),
    (21, 39, 8, 1, 'in_progress', 'QR-20260427-3C3AADA740', '', '2026-04-27 08:23:20', '2026-05-16 06:21:13', NULL),
    (22, 25, 8, 1, 'completed', 'QR-20260427-8EF86D13AE', '', '2026-04-27 08:48:07', NULL, '2026-04-27 08:49:17'),
    (23, 31, 8, 1, 'assigned', 'QR-20260428-DE0FCF800D', '', '2026-04-27 22:26:35', '2026-04-27 22:28:18', NULL),
    (24, 44, 8, 1, 'completed', 'QR-20260428-B23DFB6D33', '', '2026-04-27 22:33:17', '2026-05-07 21:29:57', '2026-05-16 06:26:27'),
    (25, 49, 8, 1, 'assigned', 'QR-20260428-C556F96F87', '', '2026-04-27 22:46:13', '2026-04-27 22:47:13', NULL),
    (26, 42, 8, 1, 'completed', 'QR-20260502-B5CB876753', '', '2026-05-02 08:28:45', '2026-05-07 21:26:23', '2026-05-07 22:17:17'),
    (27, 50, 8, 1, 'assigned', 'QR-20260503-8D37089BAA', '', '2026-05-03 08:11:32', '2026-05-06 22:15:33', NULL),
    (29, 34, 8, 2, 'in_progress', 'QR-20260507-BE4FCDDB73', '', '2026-05-06 22:14:08', '2026-05-07 21:32:40', NULL),
    (30, 61, 8, 1, 'cancelled', 'QR-20260507-08F92AFB7E', 'testing', '2026-05-07 20:12:44', NULL, '2026-05-07 20:18:45'),
    (31, 62, 8, 2, 'completed', 'QR-20260508-1A35DD3E51', 'preston area', '2026-05-07 22:16:04', '2026-05-07 22:16:30', '2026-05-07 22:20:02'),
    (32, 63, 8, 2, 'completed', 'QR-20260508-DF2F5C1A59', 'note', '2026-05-07 22:31:28', '2026-05-07 22:31:56', '2026-05-16 08:18:30'),
    (33, 64, 8, 2, 'completed', 'QR-20260510-1015B8185D', 'testing testing', '2026-05-10 08:02:56', '2026-05-10 08:03:27', '2026-05-10 20:57:53'),
    (34, 67, 8, 2, 'completed', 'QR-20260516-E114939839', 'collect cash please', '2026-05-16 07:48:21', '2026-05-16 07:49:18', '2026-05-16 08:18:38'),
    (35, 69, 8, 2, 'assigned', 'QR-20260516-25BE2004C4', 'on time', '2026-05-16 07:48:47', NULL, NULL)
  `);

  // ============ REFUNDS ============
  console.log('Inserting refunds...');
  await db.execute(`
    INSERT OR IGNORE INTO Refund (id, userId, bookingId, invoiceId, amount, refundType, reason, status, adminNotes, requestedAt, processedAt) VALUES
    (1, 6, 30, 15, 237.50, 'full', 'i will be out on the day', 'pending', NULL, '2026-04-05 08:23:56', NULL),
    (2, 6, 60, 22, 180.00, 'partial', 'NO REQURED', 'approved', 'all good', '2026-05-06 22:21:02', '2026-05-13 17:20:39'),
    (3, 6, 57, 19, 213.75, 'partial', 'NOTHING SPECIAL', 'rejected', 'fake', '2026-05-07 16:57:57', '2026-05-13 17:01:57'),
    (4, 6, 58, 20, 102.60, 'partial', 'testingggg', 'approved', 'genuine', '2026-05-07 17:32:14', '2026-05-13 17:01:37'),
    (5, 6, 65, 28, 85.50, 'partial', 'nobody at home', 'pending', NULL, '2026-05-13 17:26:47', NULL),
    (6, 6, 68, 32, 85.50, 'partial', 'FORGOT TO PUT ACCESS NOTES', 'pending', NULL, '2026-05-16 07:43:00', NULL)
  `);

  // ============ CANCELLATION LOGS ============
  console.log('Inserting cancellation logs...');
  await db.execute(`
    INSERT OR IGNORE INTO CancellationLog (id, bookingId, userId, cancelledBy, reason, refundAmount, refundProcessed, createdAt) VALUES
    (5, 31, 6, 'customer', 'lkajsdflkjafjlkasldfajfals', 114.00, 0, '2026-04-04 08:52:15'),
    (6, 27, 6, 'customer', 'kjadklgjlkajlsdjfkljasldfa', 0.00, 0, '2026-04-05 09:10:33'),
    (7, 29, 6, 'customer', 'i am out onthis day', 114.00, 1, '2026-04-07 06:40:41'),
    (8, 45, 6, 'customer', 'ADFJJALSDFADSF', 0.00, 0, '2026-04-20 22:48:52'),
    (9, 35, 6, 'customer', 'KLLLKJL;KJKLJLJLJLK', 0.00, 0, '2026-04-20 22:49:48'),
    (10, 50, 6, 'customer', 'mistakely booked', 0.00, 0, '2026-05-03 08:17:14')
  `);

  // ============ ALERT SUBSCRIPTIONS ============
  console.log('Inserting alert subscriptions...');
  await db.execute(`
    INSERT OR IGNORE INTO AlertSubscription (id, adminId, eventType, emailAlert, createdAt) VALUES
    (1, 1, 'admin_created', 1, '2026-04-28 16:02:31'),
    (2, 1, 'admin_deleted', 1, '2026-04-28 16:02:31'),
    (3, 1, 'super_admin_login', 1, '2026-04-28 16:02:31'),
    (4, 1, 'failed_login_super_admin', 1, '2026-04-28 16:02:31'),
    (5, 1, 'password_reset_admin', 1, '2026-04-28 16:02:31'),
    (6, 1, 'mass_booking_deletion', 1, '2026-04-28 16:02:31'),
    (7, 1, 'payment_refund_processed', 1, '2026-04-28 16:02:31')
  `);

  // ============ STAFF PASSWORD RESETS ============
  console.log('Inserting staff password resets...');
  await db.execute(`
    INSERT OR IGNORE INTO StaffPasswordReset (id, staffId, token, tempPasswordHash, expiredAt, usedAt, createdAt) VALUES
    (3, 5, '4f3dde5bc449bcf1b63a281765e4161f3f5a255a3895573b120a5d36b9c11bea', '$2y$10$d7ItPj9fjkR3IzmoSVBqHO7reeUVR1BdrRNTK8L6o5822Jsc24DL2', NULL, NULL, '2026-04-17 12:30:10'),
    (6, 8, 'f43751f91efc88d300b6e317a52a43d88794043b7dc403a7522b8b9a6a2ab3e6', '$2y$10$7ENJoATjaZCJgHPe1GfuIe7pb2i.fsjtexsJ2f3MHCO8MNtMyCgrq', '2026-04-22 23:13:20', '2026-04-21 22:15:34', '2026-04-21 22:13:20')
  `);

  // Verify counts
  console.log('\nVerifying data counts...');
  const tables = ['Admin', 'User', 'Staff', 'Service', 'Booking', 'Invoice', 'Payment', 'Refund', 'Faq', 'BookingAssignment', 'CancellationLog', 'AlertSubscription', 'StaffPasswordReset'];
  for (const table of tables) {
    const result = await db.execute(`SELECT COUNT(*) as cnt FROM "${table}"`);
    console.log(`  ${table}: ${result.rows[0].cnt} rows`);
  }

  console.log('\nData migration completed successfully!');
}

run().catch(console.error);
