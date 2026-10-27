import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../widgets/ai_scan_sheet.dart';
import '../widgets/gemini_api_key_dialog.dart';
import '../widgets/assistant_chat_sheet.dart';
import '../widgets/calculator_tools_sheet.dart';
import '../widgets/motion_widgets.dart';
import 'doclens_screen.dart';

class AllToolsScreen extends StatefulWidget {
  final Function(int tabIndex, {int? subTabIndex}) onNavigateTab;

  const AllToolsScreen({super.key, required this.onNavigateTab});

  @override
  State<AllToolsScreen> createState() => _AllToolsScreenState();
}

class _AllToolsScreenState extends State<AllToolsScreen> {
  String _searchQuery = '';
  String _selectedCategory = 'Semua';

  final List<String> _categories = [
    'Semua',
    'AI & Visi',
    'Finansial',
    'Produktivitas',
    'Keamanan',
  ];

  @override
  Widget build(BuildContext context) {
    final tools = _getFilteredTools();

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Semua Alat & Utilitas',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
                letterSpacing: -0.3,
              ),
            ),
            Text(
              'Pusat seluruh fitur produktivitas, kalkulator, & asisten',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => GeminiApiKeyDialog.show(context),
            icon: const Icon(Icons.key_outlined, color: AppColors.textSecondary),
            tooltip: 'Konfigurasi Assistant API Key',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Box
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Icon(Icons.search_rounded, size: 20, color: AppColors.textMuted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                      decoration: const InputDecoration(
                        hintText: 'Cari alat atau utilitas...',
                        hintStyle: TextStyle(fontSize: 13, color: AppColors.textMuted),
                        border: InputBorder.none,
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    InkWell(
                      onTap: () => setState(() => _searchQuery = ''),
                      child: const Icon(Icons.close, size: 16, color: AppColors.textSecondary),
                    ),
                ],
              ),
            ),
          ),

          // Category Filter Pills
          SizedBox(
            height: 44,
            child: ListView.separated(
              physics: const BouncingScrollPhysics(),
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (ctx, idx) {
                final cat = _categories[idx];
                final isSelected = _selectedCategory == cat;

                return ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  selectedColor: AppColors.textPrimary,
                  backgroundColor: AppColors.surface,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.canvas : AppColors.textSecondary,
                  ),
                  side: BorderSide(
                    color: isSelected ? AppColors.textPrimary : AppColors.border,
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  showCheckmark: false,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Tools List View
          Expanded(
            child: tools.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.search_off_rounded, size: 40, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text(
                          'Tidak ada alat yang cocok dengan "$_searchQuery"',
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: tools.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (ctx, idx) {
                      final tool = tools[idx];
                      return StaggeredEntrance(
                        index: idx,
                        child: _buildToolTile(tool),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolTile(_ToolItem tool) {
    return TouchScale(
      onTap: tool.action,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Icon(tool.icon, size: 20, color: AppColors.textPrimary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tool.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    tool.description,
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }

  List<_ToolItem> _getFilteredTools() {
    final all = [
      _ToolItem(
        title: 'Auto-Scan Struk Belanja',
        category: 'AI & Visi',
        description: 'Pindai foto nota belanja dan catat pengeluaran instan ke Keuangan.',
        icon: Icons.receipt_long_rounded,
        action: () => AiScanSheet.show(context, scanType: AiScanType.receipt),
      ),
      _ToolItem(
        title: 'Auto-Scan KTP / SIM',
        category: 'AI & Visi',
        description: 'Deteksi otomatis NIK 16 digit, nama pemegang, dan masa berlaku ke Brankas.',
        icon: Icons.badge_outlined,
        action: () => AiScanSheet.show(context, scanType: AiScanType.ktpOrId),
      ),
      _ToolItem(
        title: 'DocLens Pemindai Dokumen',
        category: 'AI & Visi',
        description: 'Pemindai multi-halaman dengan filter pemutihan dan kompilasi PDF.',
        icon: Icons.document_scanner_rounded,
        action: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DocLensScreen())),
      ),
      _ToolItem(
        title: 'Smart Assistant',
        category: 'AI & Visi',
        description: 'Tanya panduan aplikasi, foto struk belanja untuk dicatat otomatis, atau tanya hal apapun.',
        icon: Icons.auto_awesome,
        action: () => AssistantChatSheet.show(context, onNavigateTab: (idx) => widget.onNavigateTab(idx)),
      ),
      _ToolItem(
        title: 'Konfigurasi Assistant Cloud API',
        category: 'AI & Visi',
        description: 'Akselerasi analisis gambar dan pemrosesan AI di cloud dengan API key gratis.',
        icon: Icons.key_outlined,
        action: () => GeminiApiKeyDialog.show(context),
      ),
      _ToolItem(
        title: 'Kalkulator Split Bill',
        category: 'Finansial',
        description: 'Hitung tagihan makan bersama per orang lengkap dengan pajak PB1.',
        icon: Icons.pie_chart_outline_rounded,
        action: () => CalculatorToolsSheet.show(context, initialTab: 0),
      ),
      _ToolItem(
        title: 'Kalkulator Diskon Promo',
        category: 'Finansial',
        description: 'Ketahui nilai nominal hemat dan harga bersih barang sebelum membeli.',
        icon: Icons.percent_rounded,
        action: () => CalculatorToolsSheet.show(context, initialTab: 1),
      ),
      _ToolItem(
        title: 'Catat Keuangan & Anggaran',
        category: 'Finansial',
        description: 'Pencatatan pemasukan dan pengeluaran harian dengan grafik ringkasan.',
        icon: Icons.account_balance_wallet_outlined,
        action: () => widget.onNavigateTab(1),
      ),
      _ToolItem(
        title: 'Timer Fokus Pomodoro',
        category: 'Produktivitas',
        description: 'Ritme kerja terstruktur 25 menit dan 5 menit istirahat.',
        icon: Icons.timer_outlined,
        action: () => widget.onNavigateTab(2),
      ),
      _ToolItem(
        title: 'To-Do & Manajemen Tugas',
        category: 'Produktivitas',
        description: 'Daftar tugas terstruktur dengan indikator prioritas.',
        icon: Icons.checklist_rounded,
        action: () => widget.onNavigateTab(2),
      ),
      _ToolItem(
        title: 'Habit Tracker Konsistensi',
        category: 'Produktivitas',
        description: 'Bangun kebiasaan positif harian dan pantau streak mingguan.',
        icon: Icons.check_circle_outline,
        action: () => widget.onNavigateTab(2),
      ),
      _ToolItem(
        title: 'Brankas ID & Kartu Aman',
        category: 'Keamanan',
        description: 'Penyimpanan NIK, SIM, dan rekening bank di memori internal.',
        icon: Icons.shield_outlined,
        action: () => widget.onNavigateTab(3),
      ),
    ];

    return all.where((t) {
      final matchCat = _selectedCategory == 'Semua' || t.category == _selectedCategory;
      final matchSearch = _searchQuery.isEmpty ||
          t.title.toLowerCase().contains(_searchQuery) ||
          t.description.toLowerCase().contains(_searchQuery) ||
          t.category.toLowerCase().contains(_searchQuery);
      return matchCat && matchSearch;
    }).toList();
  }
}

class _ToolItem {
  final String title;
  final String category;
  final String description;
  final IconData icon;
  final VoidCallback action;

  _ToolItem({
    required this.title,
    required this.category,
    required this.description,
    required this.icon,
    required this.action,
  });
}
