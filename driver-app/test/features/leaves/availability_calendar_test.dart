import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:driver_app/core/config/leave_config.dart';
import 'package:driver_app/core/theme/app_theme.dart';
import 'package:driver_app/features/leaves/data/leave_repository.dart';
import 'package:driver_app/features/leaves/presentation/availability_calendar_screen.dart';
import 'package:driver_app/features/trips/data/trip_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
  });

  group('Leave Rules & Business Logic Tests', () {
    test('Notice period: rejects leave earlier than minNoticeDays in advance', () async {
      final tripRepo = MockTripRepository();
      final leaveRepo = MockLeaveRepository(tripRepo);

      // Reference: 2026-10-18
      final refDate = DateTime(2026, 10, 18);

      // Try applying for 5 days in advance (requires minNoticeDays = 7)
      final earlyDate = refDate.add(const Duration(days: 5));
      expect(
        () => leaveRepo.applyLeave(
          startDate: earlyDate,
          endDate: earlyDate,
          referenceNow: refDate,
        ),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Leave must be applied at least ${LeaveConfig.minNoticeDays} days in advance'),
          ),
        ),
      );
    });

    test('Monthly limit: refuses 6th leave day in a month (maxLeaveDaysPerMonth = 5)', () async {
      final tripRepo = MockTripRepository();
      final leaveRepo = MockLeaveRepository(tripRepo);

      final refDate = DateTime(2026, 10, 18);

      // Apply 5 days in Nov 2026 (Nov 10 to Nov 14 = 5 days)
      final start1 = DateTime(2026, 11, 10);
      final end1 = DateTime(2026, 11, 14);
      await leaveRepo.applyLeave(
        startDate: start1,
        endDate: end1,
        referenceNow: refDate,
      );

      // Now apply 1 more day in Nov 2026 (Nov 20) -> should be rejected
      final start2 = DateTime(2026, 11, 20);
      expect(
        () => leaveRepo.applyLeave(
          startDate: start2,
          endDate: start2,
          referenceNow: refDate,
        ),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Exceeds monthly limit of ${LeaveConfig.maxLeaveDaysPerMonth} leave days'),
          ),
        ),
      );
    });

    test('Month boundary: leave spanning two months counts each month independently', () async {
      final tripRepo = MockTripRepository();
      final leaveRepo = MockLeaveRepository(tripRepo);

      final refDate = DateTime(2026, 10, 18);

      // Leave spanning Oct 28 to Nov 1:
      // Oct: Oct 28, 29, 30, 31 = 4 days (<= 5)
      // Nov: Nov 1 = 1 day (<= 5)
      final leave = await leaveRepo.applyLeave(
        startDate: DateTime(2026, 10, 28),
        endDate: DateTime(2026, 11, 1),
        referenceNow: refDate,
      );

      expect(leave.daysInMonth(2026, 10), 4);
      expect(leave.daysInMonth(2026, 11), 1);
      expect(leave.daysCount, 5);
    });

    test('Trip conflict: cannot apply leave on a date with an assigned trip', () async {
      final tripRepo = MockTripRepository();
      final leaveRepo = MockLeaveRepository(tripRepo);

      final trips = await tripRepo.getTrips();
      final assignedTrip = trips.firstWhere((t) => t.isAssigned || t.isOngoing);
      final tripDate = assignedTrip.pickupTime;

      final refDate = tripDate.subtract(Duration(days: LeaveConfig.minNoticeDays + 5));

      expect(
        () => leaveRepo.applyLeave(
          startDate: tripDate,
          endDate: tripDate,
          referenceNow: refDate,
        ),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('You have an assigned trip #ORD-${assignedTrip.orderId}'),
          ),
        ),
      );
    });

    test('Cancellation: future leave can be cancelled, but started or past leave cannot', () async {
      final tripRepo = MockTripRepository();
      final leaveRepo = MockLeaveRepository(tripRepo);

      final refDate = DateTime(2026, 10, 18);

      // Apply future leave for Nov 15
      final leave = await leaveRepo.applyLeave(
        startDate: DateTime(2026, 11, 15),
        endDate: DateTime(2026, 11, 15),
        referenceNow: refDate,
      );

      // Verify leave exists
      var leaves = await leaveRepo.getLeaves();
      expect(leaves.length, 1);

      // Cancelling with future reference date works
      await leaveRepo.cancelLeave(leave.leaveId, referenceNow: DateTime(2026, 11, 1));
      leaves = await leaveRepo.getLeaves();
      expect(leaves.isEmpty, true);

      // Re-apply for Nov 15
      final leave2 = await leaveRepo.applyLeave(
        startDate: DateTime(2026, 11, 15),
        endDate: DateTime(2026, 11, 15),
        referenceNow: refDate,
      );

      // Cancelling when date is reached or passed is refused
      expect(
        () => leaveRepo.cancelLeave(leave2.leaveId, referenceNow: DateTime(2026, 11, 15)),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('Cannot cancel a leave that has already started or is in the past'),
          ),
        ),
      );
    });
  });

  group('Availability Calendar Widget Tests', () {
    testWidgets('Renders calendar, displays notice period & empty leaves state', (tester) async {
      await tester.binding.setSurfaceSize(const Size(360, 800));

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const AvailabilityCalendarScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Header title
      expect(find.text('Availability Calendar'), findsOneWidget);

      // Month navigation buttons exist
      expect(find.byIcon(Icons.chevron_left_rounded), findsOneWidget);
      expect(find.byIcon(Icons.chevron_right_rounded), findsOneWidget);

      // Notice period banner text using LeaveConfig.minNoticeDays
      expect(
        find.textContaining('Leave must be applied at least ${LeaveConfig.minNoticeDays} days in advance'),
        findsOneWidget,
      );

      // Remaining days text
      expect(find.textContaining('left'), findsOneWidget);

      // Empty state "No leaves"
      expect(find.text('No leaves'), findsOneWidget);
    });
  });
}
