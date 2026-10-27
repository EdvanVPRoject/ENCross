import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:open_filex/open_filex.dart';
import 'package:image/image.dart' as img;
import '../../core/theme/app_theme.dart';
import '../../data/models/doclens_document.dart';
import '../../providers/doclens_provider.dart';
import 'doclens_tools_sheet.dart';
import 'motion_widgets.dart';

class DocLensSection extends StatelessWidget {
  const DocLensSection({super.key});

  @override
  Widget build(BuildContext context) {
    final docLens = context.watch<DocLensProvider>();

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: docLens.pages.isEmpty
          ? _buildEmptyState(context, docLens)
          : _buildActiveSession(context, docLens),
      bottomNavigationBar: docLens.pages.isEmpty
          ? null
          : _buildCompileBottomBar(context, docLens),
    );
  }

  // --- EMPTY STATE ---
  Widget _buildEmptyState(BuildContext context, DocLensProvider docLens) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border),
              ),
              child: const Icon(
                Icons.document_scanner_outlined,
                size: 38,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Belum Ada Dokumen',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Pindai lembaran fisik atau impor foto dokumen untuk diolah ke format PDF.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textMuted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TouchScale(
                  onTap: () => _pickFromCamera(context, docLens),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.textPrimary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.camera_alt, size: 16, color: Colors.black),
                        SizedBox(width: 8),
                        Text(
                          'Kamera',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                TouchScale(
                  onTap: () => _pickImages(context, docLens),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.photo_library_outlined, size: 16, color: AppColors.textPrimary),
                        SizedBox(width: 8),
                        Text(
                          'Galeri Berkas',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TouchScale(
              onTap: () => _createDemoDocument(docLens),
              child: const Padding(
                padding: EdgeInsets.all(8),
                child: Text(
                  'Muat Lembar Contoh Uji Coba',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- ACTIVE SESSION ---
  Widget _buildActiveSession(BuildContext context, DocLensProvider docLens) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        // Top Toolbar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${docLens.pageCount} Lembar Halaman',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Row(
              children: [
                IconButton(
                  tooltip: 'Tambah Halaman',
                  onPressed: () => _pickImages(context, docLens),
                  icon: const Icon(Icons.add_photo_alternate_rounded, color: AppColors.accentSky),
                ),
                IconButton(
                  tooltip: 'Reset Sesi',
                  onPressed: () => _confirmReset(context, docLens),
                  icon: const Icon(Icons.refresh_rounded, color: AppColors.accentRose),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Paper Format Selector
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Format Ukuran Kertas PDF:',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _buildPaperChip(
                    context,
                    docLens,
                    DocLensPaperFormat.a4,
                    'A4 (210×297)',
                  ),
                  const SizedBox(width: 8),
                  _buildPaperChip(
                    context,
                    docLens,
                    DocLensPaperFormat.f4,
                    'F4 Folio (215×330)',
                  ),
                  const SizedBox(width: 8),
                  _buildPaperChip(
                    context,
                    docLens,
                    DocLensPaperFormat.letter,
                    'Letter',
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Quick Document Utility Bar (Watermark & Target Kompresi)
        Row(
          children: [
            Expanded(
              child: TouchScale(
                onTap: () => _openWatermarkConfig(context, docLens),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: docLens.watermarkConfig != null
                        ? AppColors.accentAmber.withValues(alpha: 0.12)
                        : AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: docLens.watermarkConfig != null
                          ? AppColors.accentAmber
                          : AppColors.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.verified_user_outlined,
                        size: 16,
                        color: docLens.watermarkConfig != null
                            ? AppColors.accentAmber
                            : AppColors.textMuted,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Watermark',
                              style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                            Text(
                              docLens.watermarkConfig != null
                                  ? docLens.watermarkConfig!.text
                                  : 'Nonaktif',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TouchScale(
                onTap: () => _openQualityConfig(context, docLens),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.compress_rounded,
                        size: 16,
                        color: AppColors.accentCyan,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Target Kualitas',
                              style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                            ),
                            Text(
                              _getQualityLabel(docLens.qualityPreset),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Page Cards
        ...docLens.pages.asMap().entries.map((entry) {
          final index = entry.key;
          final page = entry.value;
          return _buildPageCard(context, docLens, index, page);
        }),
      ],
    );
  }

  Widget _buildPaperChip(
    BuildContext context,
    DocLensProvider docLens,
    DocLensPaperFormat format,
    String label,
  ) {
    final isSelected = docLens.selectedPaperFormat == format;

    return Expanded(
      child: GestureDetector(
        onTap: () => docLens.setPaperFormat(format),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 8),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentSky.withValues(alpha: 0.15) : AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? AppColors.accentSky : AppColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              color: isSelected ? AppColors.accentSky : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  // --- PAGE CARD ---
  Widget _buildPageCard(
    BuildContext context,
    DocLensProvider docLens,
    int index,
    DocLensPage page,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thumbnail preview
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 90,
                  height: 120,
                  color: Colors.black38,
                  child: Image.memory(
                    page.displayBytes,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Controls & Actions
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Text(
                            'Halaman ${index + 1}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: AppColors.accentSky,
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            IconButton(
                              iconSize: 18,
                              tooltip: 'Putar 90°',
                              onPressed: () => docLens.rotatePage(index),
                              icon: const Icon(Icons.rotate_right_rounded, color: AppColors.textPrimary),
                            ),
                            IconButton(
                              iconSize: 18,
                              tooltip: 'Hapus Halaman',
                              onPressed: () => docLens.removePage(index),
                              icon: const Icon(Icons.delete_outline_rounded, color: AppColors.accentRose),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    const Text(
                      'Pilihan Filter:',
                      style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 6),

                    // Filter selector chips
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _buildFilterOption(
                          docLens,
                          index,
                          page.filter,
                          DocLensFilter.magicColor,
                          'Magic Color',
                          Icons.auto_fix_high_rounded,
                        ),
                        _buildFilterOption(
                          docLens,
                          index,
                          page.filter,
                          DocLensFilter.monochrome,
                          'Monokrom',
                          Icons.contrast_rounded,
                        ),
                        _buildFilterOption(
                          docLens,
                          index,
                          page.filter,
                          DocLensFilter.grayscale,
                          'Abu-abu',
                          Icons.filter_b_and_w_rounded,
                        ),
                        _buildFilterOption(
                          docLens,
                          index,
                          page.filter,
                          DocLensFilter.original,
                          'Asli',
                          Icons.image_outlined,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Per-page Document Tools transferred from DocLens PDF
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _buildActionToolButton(
                          label: page.signatureBytes != null ? 'TTD Terpasang' : 'Tanda Tangan',
                          icon: Icons.draw_rounded,
                          color: page.signatureBytes != null ? AppColors.accentEmerald : AppColors.accentSky,
                          onTap: () => _openSignature(context, docLens, index),
                        ),
                        _buildActionToolButton(
                          label: page.redactions.isNotEmpty ? '${page.redactions.length} Sensor' : 'Sensor NIK',
                          icon: Icons.visibility_off_rounded,
                          color: page.redactions.isNotEmpty ? AppColors.accentRose : AppColors.textSecondary,
                          onTap: () => _openRedact(context, docLens, index, page),
                        ),
                        _buildActionToolButton(
                          label: 'OCR Teks',
                          icon: Icons.text_snippet_rounded,
                          color: AppColors.accentCyan,
                          onTap: () => _runOcr(context, docLens, index),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterOption(
    DocLensProvider docLens,
    int pageIndex,
    DocLensFilter current,
    DocLensFilter target,
    String label,
    IconData icon,
  ) {
    final isSelected = current == target;

    return GestureDetector(
      onTap: () => docLens.setPageFilter(pageIndex, target),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentSky.withValues(alpha: 0.18) : AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isSelected ? AppColors.accentSky : AppColors.border,
            width: isSelected ? 1.2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 11,
              color: isSelected ? AppColors.accentSky : AppColors.textSecondary,
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppColors.accentSky : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- COMPILE BOTTOM BAR ---
  Widget _buildCompileBottomBar(BuildContext context, DocLensProvider docLens) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        child: ElevatedButton.icon(
          onPressed: docLens.isProcessing ? null : () => _handleCompile(context, docLens),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentSky,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
          icon: docLens.isProcessing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                )
              : const Icon(Icons.picture_as_pdf_rounded, size: 20),
          label: Text(
            docLens.isProcessing
                ? 'Mengompilasi Dokumen PDF...'
                : 'Kompilasi ke PDF (${docLens.pageCount} Halaman)',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          ),
        ),
      ),
    );
  }

  // --- ACTIONS ---
  Future<void> _pickFromCamera(BuildContext context, DocLensProvider docLens) async {
    try {
      final picker = ImagePicker();
      final photo = await picker.pickImage(source: ImageSource.camera, imageQuality: 95);
      if (photo != null) {
        final bytes = await photo.readAsBytes();
        docLens.addPage(bytes);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal membuka kamera: $e'),
            backgroundColor: AppColors.accentRose,
          ),
        );
      }
    }
  }

  Future<void> _pickImages(BuildContext context, DocLensProvider docLens) async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.image,
      );

      if (files.isNotEmpty) {
        for (final file in files) {
          final bytes = await file.xFile.readAsBytes();
          docLens.addPage(bytes);
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memilih foto: $e'),
            backgroundColor: AppColors.accentRose,
          ),
        );
      }
    }
  }

  void _createDemoDocument(DocLensProvider docLens) {
    // Buat gambar bitmap sintetis dokumen contoh (resolusi 600x800)
    final image = img.Image(width: 600, height: 800);
    // Isi warna dasar kertas agak krem/kuning (simulasi kertas fisik)
    img.fill(image, color: img.ColorRgb8(245, 240, 230));

    // Gambar garis-garis teks dokumen simulasi
    for (int y = 100; y < 700; y += 40) {
      img.drawLine(
        image,
        x1: 60,
        y1: y,
        x2: 540,
        y2: y,
        color: img.ColorRgb8(50, 50, 60),
        thickness: 4,
      );
    }

    // Tambah stempel warna biru (simulasi tanda tangan/stempel resmi)
    img.drawCircle(
      image,
      x: 450,
      y: 650,
      radius: 50,
      color: img.ColorRgb8(20, 80, 220),
    );

    final encoded = Uint8List.fromList(img.encodeJpg(image));
    docLens.addPage(encoded);
  }

  Future<void> _handleCompile(BuildContext context, DocLensProvider docLens) async {
    final titleController = TextEditingController(text: 'Dokumen_DocLens_${DateTime.now().day}_${DateTime.now().month}');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Simpan Berkas PDF', style: TextStyle(color: AppColors.textPrimary, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Beri nama berkas dokumen Anda:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: titleController,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.surfaceElevated,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                hintText: 'Nama Dokumen',
                suffixText: '.pdf',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Batal', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentSky, foregroundColor: Colors.black),
            child: const Text('Simpan', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final file = await docLens.compileAndExportPdf(documentName: titleController.text.trim());
      if (file != null && context.mounted) {
        _showSuccessDialog(context, file.path);
      }
    }
  }

  void _showSuccessDialog(BuildContext context, String filePath) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: AppColors.accentEmerald, size: 24),
            SizedBox(width: 8),
            Text('PDF Berhasil Dibuat', style: TextStyle(color: AppColors.textPrimary, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Berkas PDF dokumen telah disimpan secara lokal di:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.surfaceElevated, borderRadius: BorderRadius.circular(8)),
              child: SelectableText(
                filePath,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: AppColors.accentSky),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              OpenFilex.open(filePath);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentSky, foregroundColor: Colors.black),
            icon: const Icon(Icons.open_in_new_rounded, size: 16),
            label: const Text('Buka PDF', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _confirmReset(BuildContext context, DocLensProvider docLens) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Reset Sesi Scan?'),
        content: const Text('Seluruh lembar foto yang belum dikompilasi akan dibersihkan dari sesi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              docLens.clearSession();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accentRose, foregroundColor: Colors.white),
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }

  Widget _buildActionToolButton({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return TouchScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 12, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
            ),
          ],
        ),
      ),
    );
  }

  String _getQualityLabel(DocLensQualityPreset preset) {
    switch (preset) {
      case DocLensQualityPreset.target300Kb:
        return '<300 KB (SSCASN)';
      case DocLensQualityPreset.target500Kb:
        return '<500 KB (Email)';
      case DocLensQualityPreset.balanced:
        return '150 DPI (Standar)';
      case DocLensQualityPreset.high:
        return '300 DPI (Cetak)';
    }
  }

  void _openWatermarkConfig(BuildContext context, DocLensProvider docLens) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensWatermarkSheet(docLens: docLens),
    );
  }

  void _openQualityConfig(BuildContext context, DocLensProvider docLens) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensQualitySheet(docLens: docLens),
    );
  }

  void _openSignature(BuildContext context, DocLensProvider docLens, int index) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensSignatureSheet(
        pageIndex: index,
        onSignatureApplied: (sigBytes, pos) {
          docLens.applySignature(index, sigBytes, pos);
        },
      ),
    );
  }

  void _openRedact(BuildContext context, DocLensProvider docLens, int index, DocLensPage page) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DocLensRedactSheet(
        pageIndex: index,
        page: page,
        onSaveRedactions: (redactions) {
          docLens.applyRedactions(index, redactions);
        },
      ),
    );
  }

  Future<void> _runOcr(BuildContext context, DocLensProvider docLens, int index) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Menganalisis teks halaman dengan Google ML Kit On-Device...'),
        duration: Duration(seconds: 1),
      ),
    );
    final text = await docLens.performOcr(index);
    if (context.mounted && text != null) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) => DocLensOcrSheet(text: text),
      );
    }
  }
}
