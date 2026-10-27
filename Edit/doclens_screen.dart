import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/services/doclens_service.dart';
import '../../providers/doclens_provider.dart';
import '../widgets/doclens_section.dart';
import '../widgets/doclens_tools_sheet.dart';
import '../widgets/motion_widgets.dart';

class DocLensScreen extends StatefulWidget {
  const DocLensScreen({super.key});

  @override
  State<DocLensScreen> createState() => _DocLensScreenState();
}

class _DocLensScreenState extends State<DocLensScreen> {
  int _activeTabIndex = 0; // 0: Lembar Kerja, 1: Utilitas PDF
  final ImagePicker _picker = ImagePicker();

  @override
  Widget build(BuildContext context) {
    final docLens = context.watch<DocLensProvider>();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'DocLens PDF',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
            letterSpacing: -0.4,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(46),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _buildSegmentPill(
                    index: 0,
                    label: docLens.pageCount > 0
                        ? 'Lembar Kerja (${docLens.pageCount})'
                        : 'Lembar Kerja',
                    icon: Icons.document_scanner_outlined,
                  ),
                ),
                Expanded(
                  child: _buildSegmentPill(
                    index: 1,
                    label: 'Utilitas Dokumen',
                    icon: Icons.grid_view_outlined,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: FadeIndexedStack(
        index: _activeTabIndex,
        children: [
          const DocLensSection(),
          _buildBentoToolsGrid(context, docLens),
        ],
      ),
    );
  }

  Widget _buildSegmentPill({
    required int index,
    required String label,
    required IconData icon,
  }) {
    final isSelected = _activeTabIndex == index;
    return TouchScale(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _activeTabIndex = index);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(vertical: 7),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.surfaceElevated : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppColors.border : Colors.transparent,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? AppColors.textPrimary : AppColors.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? AppColors.textPrimary : AppColors.textMuted,
                letterSpacing: -0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // BENTO TOOLS GRID (CLEAN, FUNCTIONAL, ZERO SLOP)
  // ==========================================
  Widget _buildBentoToolsGrid(BuildContext context, DocLensProvider docLens) {
    return ListView(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        // 2-Column Bento Grid
        LayoutBuilder(
          builder: (context, constraints) {
            final cardWidth = (constraints.maxWidth - 12) / 2;
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                // 1. Pindai Kamera
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Pindai Kamera',
                  subtitle: 'Auto-whitening & shadow fix',
                  icon: Icons.camera_alt_outlined,
                  onTap: () => _handleCameraScan(docLens),
                ),

                // 2. Tanda Tangan Digital
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Tanda Tangan',
                  subtitle: 'Kanvas digital transparan',
                  icon: Icons.draw_outlined,
                  onTap: () => _handleSignatureTool(docLens),
                ),

                // 3. Kompres PDF
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Kompres PDF',
                  subtitle: 'Target <300 KB & <500 KB',
                  icon: Icons.compress_outlined,
                  onTap: () => _handleQualityTool(docLens),
                ),

                // 4. Watermark
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Watermark',
                  subtitle: 'Cap perlindungan draf',
                  icon: Icons.verified_user_outlined,
                  onTap: () => _handleWatermarkTool(docLens),
                ),

                // 5. Sensor Dokumen
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Sensor Data',
                  subtitle: 'Blok hitam permanen NIK',
                  icon: Icons.visibility_off_outlined,
                  onTap: () => _handleRedactTool(docLens),
                ),

                // 6. Ekstraksi OCR
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Ekstrak OCR',
                  subtitle: 'Salin teks dari dokumen',
                  icon: Icons.text_snippet_outlined,
                  onTap: () => _handleOcrTool(docLens),
                ),

                // 7. Format Kertas
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Ukuran F4 / A4',
                  subtitle: 'Format resmi cetak berkas',
                  icon: Icons.format_size_rounded,
                  onTap: () {
                    setState(() => _activeTabIndex = 0);
                  },
                ),

                // 8. Gabung Berkas
                _buildBentoTile(
                  width: cardWidth,
                  title: 'Gabung PDF',
                  subtitle: 'Satukan banyak lembaran',
                  icon: Icons.layers_outlined,
                  onTap: () => _handleMergeTool(docLens),
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildBentoTile({
    required double width,
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return TouchScale(
      onTap: onTap,
      child: Container(
        width: width,
        height: 104,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, size: 20, color: AppColors.textPrimary),
                const Icon(Icons.arrow_outward_rounded, size: 14, color: AppColors.textMuted),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: AppColors.textMuted,
                    letterSpacing: -0.1,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // HANDLERS
  // ==========================================
  Future<void> _handleCameraScan(DocLensProvider docLens) async {
    try {
      final photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 95,
      );
      if (photo != null) {
        final bytes = await photo.readAsBytes();
        docLens.addPage(bytes);
        if (!mounted) return;
        setState(() => _activeTabIndex = 0);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membuka kamera: $e')),
      );
    }
  }

  void _handleSignatureTool(DocLensProvider docLens) {
    if (docLens.pages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tambahkan foto dokumen terlebih dahulu di Lembar Kerja.')),
      );
      setState(() => _activeTabIndex = 0);
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensSignatureSheet(
        pageIndex: 0,
        onSignatureApplied: (sigBytes, pos) {
          docLens.applySignature(0, sigBytes, pos);
          setState(() => _activeTabIndex = 0);
        },
      ),
    );
  }

  void _handleQualityTool(DocLensProvider docLens) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensQualitySheet(docLens: docLens),
    );
  }

  void _handleWatermarkTool(DocLensProvider docLens) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensWatermarkSheet(docLens: docLens),
    );
  }

  void _handleRedactTool(DocLensProvider docLens) {
    if (docLens.pages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tambahkan foto dokumen terlebih dahulu untuk disensor.')),
      );
      setState(() => _activeTabIndex = 0);
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensRedactSheet(
        pageIndex: 0,
        page: docLens.pages[0],
        onSaveRedactions: (redactions) {
          docLens.applyRedactions(0, redactions);
          setState(() => _activeTabIndex = 0);
        },
      ),
    );
  }

  Future<void> _handleOcrTool(DocLensProvider docLens) async {
    Uint8List? targetBytes;

    if (docLens.pages.isNotEmpty) {
      targetBytes = docLens.pages.first.displayBytes;
    } else {
      try {
        final files = await FilePicker.pickFiles(type: FileType.image);
        if (files.isNotEmpty) {
          final xFile = files.first.xFile;
          targetBytes = await xFile.readAsBytes();
        }
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memilih gambar: $e')),
        );
        return;
      }
    }

    if (targetBytes == null) return;

    if (!mounted) return;
    try {
      final docLensService = DocLensService();
      final extractedText = await docLensService.performOcr(targetBytes);
      if (!mounted) return;
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) => DocLensOcrSheet(text: extractedText),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membaca teks: $e')),
      );
    }
  }

  Future<void> _handleMergeTool(DocLensProvider docLens) async {
    try {
      final files = await FilePicker.pickFiles(type: FileType.image);
      if (files.isNotEmpty) {
        for (final file in files) {
          final bytes = await file.xFile.readAsBytes();
          docLens.addPage(bytes);
        }
        if (!mounted) return;
        setState(() => _activeTabIndex = 0);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menambahkan berkas: $e')),
      );
    }
  }
}
