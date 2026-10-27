import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/transaction_item.dart';
import '../../data/models/vault_item.dart';
import '../../data/services/local_ai_ocr_service.dart';
import '../../data/services/gemini_cloud_service.dart';
import '../../data/services/card_crop_service.dart';
import 'gemini_api_key_dialog.dart';
import '../../providers/finance_provider.dart';
import '../../providers/vault_provider.dart';

enum AiScanType { receipt, ktpOrId }

class AiScanSheet extends StatefulWidget {
  final AiScanType scanType;
  final VoidCallback? onSaved;

  const AiScanSheet({
    super.key,
    required this.scanType,
    this.onSaved,
  });

  static Future<void> show(
    BuildContext context, {
    required AiScanType scanType,
    VoidCallback? onSaved,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AiScanSheet(scanType: scanType, onSaved: onSaved),
    );
  }

  @override
  State<AiScanSheet> createState() => _AiScanSheetState();
}

class _AiScanSheetState extends State<AiScanSheet> {
  final LocalAiOcrService _ocrService = LocalAiOcrService();
  final GeminiCloudService _geminiService = GeminiCloudService();
  final CardCropService _cardCropService = CardCropService();

  bool _isProcessing = false;
  bool _hasApiKey = false;
  String? _selectedImagePath;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkApiKey();
  }

  Future<void> _checkApiKey() async {
    final hasKey = await _geminiService.hasApiKey();
    if (mounted) {
      setState(() => _hasApiKey = hasKey);
    }
  }

  // Receipt form controllers
  final _merchantCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  String _selectedCategory = 'Belanja';
  DateTime _selectedDate = DateTime.now();

  // KTP/SIM form controllers
  final _numberCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  VaultCategory _selectedDocType = VaultCategory.ktp;
  bool _isLifetime = true;
  DateTime? _expiryDate;

  bool _hasExtractedResult = false;

  final List<String> _categories = [
    'Belanja',
    'Makanan & Minuman',
    'Transportasi',
    'Kesehatan',
    'Tagihan',
    'Hiburan',
    'Lainnya',
  ];

  @override
  void dispose() {
    _merchantCtrl.dispose();
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    _numberCtrl.dispose();
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickAndProcess(ImageSource source) async {
    setState(() {
      _errorMessage = null;
      _isProcessing = true;
    });

    try {
      final rawImagePath = await _ocrService.captureOrPickImage(source: source);
      if (rawImagePath == null) {
        setState(() => _isProcessing = false);
        return;
      }

      // Potong simetris sesuai kartu ISO ID-1 jika dokumen identitas
      String imagePath = rawImagePath;
      if (widget.scanType == AiScanType.ktpOrId) {
        imagePath = await _cardCropService.cropToCardSymmetrical(rawImagePath);
      }

      setState(() => _selectedImagePath = imagePath);

      ReceiptExtractionResult? receiptResult;
      KtpExtractionResult? ktpResult;

      // 1. Prioritize Gemini Flash Cloud API if user provided API Key (0% phone CPU load)
      final apiKey = await _geminiService.getApiKey();
      if (apiKey != null && apiKey.isNotEmpty) {
        if (widget.scanType == AiScanType.receipt) {
          receiptResult = await _geminiService.extractReceipt(
            imageFile: File(imagePath),
            apiKey: apiKey,
          );
        } else {
          ktpResult = await _geminiService.extractKtp(
            imageFile: File(imagePath),
            apiKey: apiKey,
          );
        }
      }

      // 2. Fallback to On-Device ML Kit OCR if Cloud didn't yield result (offline or no key)
      if (receiptResult == null && ktpResult == null) {
        final rawText = await _ocrService.recognizeTextFromPath(imagePath);

        if (rawText.trim().isEmpty) {
          setState(() {
            _isProcessing = false;
            _errorMessage = 'Teks tidak terdeteksi pada gambar. Pastikan pencahayaan cukup dan foto tegak lurus.';
          });
          return;
        }

        if (widget.scanType == AiScanType.receipt) {
          receiptResult = _ocrService.parseReceipt(rawText);
        } else {
          ktpResult = _ocrService.parseKtp(rawText);
        }
      }

      if (widget.scanType == AiScanType.receipt && receiptResult != null) {
        _merchantCtrl.text = receiptResult.merchant;
        _amountCtrl.text = receiptResult.totalAmount > 0 ? receiptResult.totalAmount.toStringAsFixed(0) : '';
        _selectedDate = receiptResult.date;
        _selectedCategory = _categories.contains(receiptResult.suggestedCategory)
            ? receiptResult.suggestedCategory
            : 'Belanja';
      } else if (ktpResult != null) {
        _selectedDocType = ktpResult.documentType;
        _numberCtrl.text = ktpResult.numberOrNik;
        _nameCtrl.text = ktpResult.fullName;
        _isLifetime = ktpResult.isLifetime;
        _expiryDate = ktpResult.expiryDate;
        _addressCtrl.text = [
          if (ktpResult.birthPlaceDate != null) 'TTL: ${ktpResult.birthPlaceDate}',
          if (ktpResult.address != null) 'Alamat: ${ktpResult.address}',
        ].join('\n');
      }

      setState(() {
        _hasExtractedResult = true;
        _isProcessing = false;
      });
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _errorMessage = 'Gagal memproses gambar: $e';
      });
    }
  }

  Future<void> _saveReceipt() async {
    final amount = double.tryParse(_amountCtrl.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0.0;
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nominal pengeluaran harus lebih besar dari 0')),
      );
      return;
    }

    final merchant = _merchantCtrl.text.trim().isEmpty ? 'Struk Toko' : _merchantCtrl.text.trim();

    final finance = context.read<FinanceProvider>();
    await finance.addTransaction(
      title: merchant,
      amount: amount,
      type: TransactionType.expense,
      category: _selectedCategory,
      date: _selectedDate,
      note: _noteCtrl.text.trim().isEmpty ? 'Auto-Scan Struk AI' : _noteCtrl.text.trim(),
    );

    if (mounted) {
      Navigator.pop(context);
      widget.onSaved?.call();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.surfaceElevated,
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: AppColors.accentEmerald, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Transaksi $merchant (${Formatters.formatRupiah(amount)}) berhasil dicatat!',
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

  Future<void> _saveKtpOrId() async {
    final number = _numberCtrl.text.trim();
    if (number.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nomor dokumen/NIK tidak boleh kosong')),
      );
      return;
    }

    final holder = _nameCtrl.text.trim().isEmpty ? 'Pemegang Kartu' : _nameCtrl.text.trim();
    final docTitle = _selectedDocType == VaultCategory.ktp
        ? 'KTP - $holder'
        : 'SIM - $holder';

    final vault = context.read<VaultProvider>();
    await vault.addItem(
      title: docTitle,
      numberOrCode: number,
      holderName: holder,
      category: _selectedDocType,
      expiryDate: _isLifetime ? null : _expiryDate,
      notes: _addressCtrl.text.trim().isEmpty ? 'Auto-Scan AI On-Device' : _addressCtrl.text.trim(),
      imagePath: _selectedImagePath,
    );

    if (mounted) {
      Navigator.pop(context);
      widget.onSaved?.call();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.surfaceElevated,
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: AppColors.accentEmerald, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '$docTitle berhasil disimpan ke Brankas!',
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isReceipt = widget.scanType == AiScanType.receipt;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
          left: BorderSide(color: AppColors.border, width: 1),
          right: BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Icon(
                  isReceipt ? Icons.receipt_long_rounded : Icons.badge_outlined,
                  size: 20,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isReceipt ? 'AI Auto-Scan Struk Belanja' : 'AI Auto-Scan KTP / SIM',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Icon(
                          _hasApiKey ? Icons.bolt_rounded : Icons.lock_outline,
                          size: 11,
                          color: _hasApiKey ? AppColors.accentEmerald : AppColors.textMuted,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _hasApiKey
                              ? 'Cloud Assistant (0% Beban HP)'
                              : '100% On-Device AI • Offline',
                          style: TextStyle(
                            fontSize: 11,
                            color: _hasApiKey ? AppColors.accentEmerald : AppColors.textSecondary,
                            fontWeight: _hasApiKey ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () async {
                  await GeminiApiKeyDialog.show(context);
                  _checkApiKey();
                },
                icon: Icon(
                  Icons.key_outlined,
                  color: _hasApiKey ? AppColors.accentEmerald : AppColors.textSecondary,
                  size: 20,
                ),
                tooltip: 'Pengaturan Assistant Cloud API',
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: AppColors.textSecondary, size: 20),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: AppColors.borderSubtle),
          const SizedBox(height: 16),

          Flexible(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_errorMessage != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.accentRose.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: AppColors.accentRose, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Image Selection or Preview Box
                  if (!_hasExtractedResult && !_isProcessing) ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Icon(
                            isReceipt ? Icons.document_scanner_outlined : Icons.credit_card_rounded,
                            size: 40,
                            color: AppColors.textSecondary,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            isReceipt
                                ? 'Foto struk belanja Anda untuk mencatat otomatis'
                                : 'Foto kartu identitas KTP atau SIM Anda',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            isReceipt
                                ? 'Model lokal mengekstrak toko, nominal total, dan tanggal tanpa kirim data ke server luar.'
                                : 'Model lokal mengekstrak NIK, nama lengkap, dan data penting langsung ke Brankas aman.',
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () => _pickAndProcess(ImageSource.camera),
                                  icon: const Icon(Icons.camera_alt_outlined, size: 16),
                                  label: const Text('Buka Kamera', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.textPrimary,
                                    foregroundColor: AppColors.canvas,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: () => _pickAndProcess(ImageSource.gallery),
                                  icon: const Icon(Icons.photo_library_outlined, size: 16),
                                  label: const Text('Dari Galeri', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.textPrimary,
                                    side: const BorderSide(color: AppColors.border),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Processing State
                  if (_isProcessing) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Column(
                        children: [
                          SizedBox(
                            width: 32,
                            height: 32,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.textPrimary),
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Menganalisis Dokumen Secara Lokal...',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Model OCR offline sedang mengekstrak teks & entitas data di ponsel Anda.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],

                  // Verified Extraction Form
                  if (_hasExtractedResult && !_isProcessing) ...[
                    // Photo thumbnail preview & rescan button
                    if (_selectedImagePath != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderSubtle),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (!isReceipt) ...[
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: AspectRatio(
                                  aspectRatio: CardCropService.cardAspectRatio,
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      Image.file(
                                        File(_selectedImagePath!),
                                        fit: BoxFit.cover,
                                      ),
                                      Positioned(
                                        top: 8,
                                        right: 8,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.75),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(color: AppColors.borderSubtle),
                                          ),
                                          child: const Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(Icons.crop_free_rounded, size: 12, color: AppColors.accentEmerald),
                                              SizedBox(width: 4),
                                              Text(
                                                'Auto-Crop Simetris (ISO ID-1)',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.textPrimary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                            ],
                            Row(
                              children: [
                                if (isReceipt)
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.file(
                                      File(_selectedImagePath!),
                                      width: 50,
                                      height: 50,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                if (isReceipt) const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isReceipt ? 'Hasil Ekstraksi Struk' : 'Kartu Berhasil Dipotong Rapi',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        isReceipt
                                            ? 'Periksa dan sesuaikan data sebelum disimpan'
                                            : 'Sisi latar dipotong bersih sesuai rasio kartu resmi',
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      _hasExtractedResult = false;
                                      _selectedImagePath = null;
                                    });
                                  },
                                  icon: const Icon(Icons.refresh, size: 14, color: AppColors.textSecondary),
                                  label: const Text('Ulangi', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                    if (isReceipt) ...[
                      // Receipt Fields
                      _buildTextField(
                        controller: _merchantCtrl,
                        label: 'Nama Toko / Merchant',
                        hint: 'cth: Indomaret, Starbucks',
                        icon: Icons.storefront_outlined,
                      ),
                      const SizedBox(height: 12),
                      _buildTextField(
                        controller: _amountCtrl,
                        label: 'Total Pengeluaran (Rp)',
                        hint: 'cth: 45000',
                        icon: Icons.payments_outlined,
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      _buildCategoryDropdown(),
                      const SizedBox(height: 12),
                      _buildDatePicker(
                        label: 'Tanggal Struk',
                        date: _selectedDate,
                        onPicked: (d) => setState(() => _selectedDate = d),
                      ),
                      const SizedBox(height: 12),
                      _buildTextField(
                        controller: _noteCtrl,
                        label: 'Catatan Tambahan (Opsional)',
                        hint: 'cth: Sarapan bersama tim',
                        icon: Icons.notes_outlined,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _saveReceipt,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.textPrimary,
                          foregroundColor: AppColors.canvas,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Simpan ke Keuangan', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      ),
                    ] else ...[
                      // KTP / SIM Fields
                      _buildDocTypeDropdown(),
                      const SizedBox(height: 12),
                      _buildTextField(
                        controller: _numberCtrl,
                        label: _selectedDocType == VaultCategory.ktp ? 'NIK (16 Digit)' : 'Nomor SIM',
                        hint: 'Masukkan nomor identitas',
                        icon: Icons.pin_outlined,
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      _buildTextField(
                        controller: _nameCtrl,
                        label: 'Nama Lengkap Pemegang',
                        hint: 'Nama sesuai dokumen',
                        icon: Icons.person_outline,
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Masa Berlaku Seumur Hidup', style: TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                            Switch(
                              value: _isLifetime,
                              activeThumbColor: AppColors.textPrimary,
                              onChanged: (val) => setState(() => _isLifetime = val),
                            ),
                          ],
                        ),
                      ),
                      if (!_isLifetime) ...[
                        const SizedBox(height: 12),
                        _buildDatePicker(
                          label: 'Tanggal Kadaluarsa',
                          date: _expiryDate ?? DateTime.now().add(const Duration(days: 365 * 5)),
                          onPicked: (d) => setState(() => _expiryDate = d),
                        ),
                      ],
                      const SizedBox(height: 12),
                      _buildTextField(
                        controller: _addressCtrl,
                        label: 'Alamat / Keterangan Lainnya',
                        hint: 'Alamat atau catatan identitas',
                        icon: Icons.map_outlined,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _saveKtpOrId,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.textPrimary,
                          foregroundColor: AppColors.canvas,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Simpan ke Brankas ID', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
            decoration: InputDecoration(
              prefixIcon: Icon(icon, size: 16, color: AppColors.textMuted),
              hintText: hint,
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Kategori Pengeluaran', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedCategory,
              dropdownColor: AppColors.surfaceElevated,
              isExpanded: true,
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
              icon: const Icon(Icons.arrow_drop_down, color: AppColors.textSecondary),
              items: _categories.map((cat) {
                return DropdownMenuItem<String>(
                  value: cat,
                  child: Text(cat),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedCategory = val);
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDocTypeDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Jenis Dokumen', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevated,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<VaultCategory>(
              value: _selectedDocType,
              dropdownColor: AppColors.surfaceElevated,
              isExpanded: true,
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
              icon: const Icon(Icons.arrow_drop_down, color: AppColors.textSecondary),
              items: const [
                DropdownMenuItem(value: VaultCategory.ktp, child: Text('KTP (Kartu Tanda Penduduk)')),
                DropdownMenuItem(value: VaultCategory.sim, child: Text('SIM (Surat Izin Mengemudi)')),
              ],
              onChanged: (val) {
                if (val != null) setState(() => _selectedDocType = val);
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDatePicker({
    required String label,
    required DateTime date,
    required ValueChanged<DateTime> onPicked,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 6),
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: date,
              firstDate: DateTime(2000),
              lastDate: DateTime(2040),
              builder: (ctx, child) {
                return Theme(
                  data: ThemeData.dark().copyWith(
                    colorScheme: const ColorScheme.dark(
                      primary: AppColors.textPrimary,
                      onPrimary: AppColors.canvas,
                      surface: AppColors.surfaceElevated,
                      onSurface: AppColors.textPrimary,
                    ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) onPicked(picked);
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.textMuted),
                    const SizedBox(width: 10),
                    Text(Formatters.formatDate(date), style: const TextStyle(fontSize: 13, color: AppColors.textPrimary)),
                  ],
                ),
                const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.textSecondary),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
