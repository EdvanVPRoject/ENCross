import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:enlife/data/services/storage_service.dart';
import 'package:enlife/providers/doclens_provider.dart';
import 'package:enlife/ui/widgets/doclens_section.dart';
import 'package:enlife/main.dart';

void main() {
  testWidgets('App smoke test - ENLifeApp builds and renders correctly', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final storageService = StorageService();
    await storageService.init();

    await tester.pumpWidget(ENLifeApp(storageService: storageService));
    await tester.pumpAndSettle();

    expect(find.byType(ENLifeApp), findsOneWidget);
    expect(find.text('ENLife v1.0'), findsOneWidget);
    expect(find.text('Beranda'), findsOneWidget);
    expect(find.text('Keuangan'), findsOneWidget);
    expect(find.text('Semua Alat'), findsWidgets);
    expect(find.text('Tanya Assistant'), findsOneWidget);
  });

  testWidgets('DocLensSection renders empty state and generates sample document', (WidgetTester tester) async {
    final provider = DocLensProvider();

    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<DocLensProvider>.value(
          value: provider,
          child: const Scaffold(body: DocLensSection()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Belum Ada Dokumen'), findsOneWidget);
    expect(find.text('Muat Lembar Contoh Uji Coba'), findsOneWidget);

    // Tap create demo document
    await tester.tap(find.text('Muat Lembar Contoh Uji Coba'));
    await tester.pumpAndSettle();

    expect(provider.pageCount, equals(1));
    expect(find.text('1 Lembar Halaman'), findsOneWidget);
    expect(find.text('Halaman 1'), findsOneWidget);
    expect(find.text('Magic Color'), findsOneWidget);
    expect(find.text('Monokrom'), findsOneWidget);
  });
}
