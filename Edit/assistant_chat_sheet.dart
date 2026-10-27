import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:open_filex/open_filex.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/transaction_item.dart';
import '../../data/services/device_assistant_service.dart';
import '../../data/services/gemini_cloud_service.dart';
import '../../data/services/local_ai_ocr_service.dart';
import '../../providers/finance_provider.dart';
import '../../providers/habit_provider.dart';
import '../../providers/task_provider.dart';
import '../../providers/vault_provider.dart';
import 'gemini_api_key_dialog.dart';

enum ChatSender { user, assistant }

class ChatMessage {
  final String id;
  final ChatSender sender;
  final String text;
  final String? imagePath;
  final ReceiptExtractionResult? receiptData;
  bool isReceiptSaved;
  final List<AssistantMatchItem>? matchItems;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.sender,
    required this.text,
    this.imagePath,
    this.receiptData,
    this.isReceiptSaved = false,
    this.matchItems,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class AssistantChatSheet extends StatefulWidget {
  final Function(int) onNavigateTab;

  const AssistantChatSheet({super.key, required this.onNavigateTab});

  static Future<void> show(BuildContext context, {required Function(int) onNavigateTab}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AssistantChatSheet(onNavigateTab: onNavigateTab),
    );
  }

  @override
  State<AssistantChatSheet> createState() => _AssistantChatSheetState();
}

class _AssistantChatSheetState extends State<AssistantChatSheet> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final _picker = ImagePicker();

  final _deviceAssistant = DeviceAssistantService();
  final _geminiService = GeminiCloudService();
  final _ocrService = LocalAiOcrService();

  final List<ChatMessage> _messages = [];
  bool _isTyping = false;
  bool _hasApiKey = false;

  @override
  void initState() {
    super.initState();
    _checkApiKey();
    _initWelcomeMessage();
  }

  Future<void> _checkApiKey() async {
    final hasKey = await _geminiService.hasApiKey();
    if (mounted) {
      setState(() => _hasApiKey = hasKey);
    }
  }

  void _initWelcomeMessage() {
    _messages.add(
      ChatMessage(
        id: 'welcome',
        sender: ChatSender.assistant,
        text: 'Halo! Saya Assistant ENLife. Anda bisa menanyakan panduan aplikasi, mengecek saldo, mencari berkas di HP, menanyakan hal apapun di luar aplikasi, atau memotret struk belanja lewat tombol kamera di bawah untuk dicatat otomatis ke Keuangan.',
      ),
    );
  }

  @override
  void dispose() {
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleSendMessage({String? customText}) async {
    final text = (customText ?? _inputCtrl.text).trim();
    if (text.isEmpty) return;

    _inputCtrl.clear();

    final userMsg = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      sender: ChatSender.user,
      text: text,
    );

    setState(() {
      _messages.add(userMsg);
      _isTyping = true;
    });
    _scrollToBottom();

    final vault = context.read<VaultProvider>();
    final finance = context.read<FinanceProvider>();
    final task = context.read<TaskProvider>();
    final habit = context.read<HabitProvider>();

    String responseText = '';
    List<AssistantMatchItem>? matches;

    final q = text.toLowerCase();

    // 1. Cek apakah ini pertanyaan terkait data internal aplikasi
    final isAppDataQuery = q.contains('saldo') ||
        q.contains('pengeluaran') ||
        q.contains('pemasukan') ||
        q.contains('uang') ||
        q.contains('ktp') ||
        q.contains('sim') ||
        q.contains('file') ||
        q.contains('pdf') ||
        q.contains('tugas') ||
        q.contains('habit') ||
        q.contains('kebiasaan') ||
        q.contains('untuk apa') ||
        q.contains('cara pakai') ||
        q.contains('fitur');

    if (isAppDataQuery) {
      final internalRes = await _deviceAssistant.processNaturalQuery(
        query: text,
        vaultItems: vault.items,
        transactions: finance.items,
        tasks: task.items,
        habits: habit.items,
      );
      responseText = internalRes.aiMessage;
      matches = internalRes.matches;
    } else {
      // 2. Pertanyaan umum / di luar aplikasi
      final apiKey = await _geminiService.getApiKey();
      if (apiKey != null && apiKey.isNotEmpty) {
        final appContext = 'Saldo Dompet: ${Formatters.formatRupiah(finance.netBalance)}, Total Pengeluaran: ${Formatters.formatRupiah(finance.totalExpense)}, Tugas Pending: ${task.pendingTasks.length}';
        final cloudRes = await _geminiService.generateChatResponse(
          prompt: text,
          apiKey: apiKey,
          appContext: appContext,
        );
        if (cloudRes != null && cloudRes.isNotEmpty) {
          responseText = cloudRes;
        }
      }

      // Fallback jika tidak ada API key atau cloud gagal
      if (responseText.isEmpty) {
        final internalRes = await _deviceAssistant.processNaturalQuery(
          query: text,
          vaultItems: vault.items,
          transactions: finance.items,
          tasks: task.items,
          habits: habit.items,
        );
        if (internalRes.matches.isNotEmpty) {
          responseText = internalRes.aiMessage;
          matches = internalRes.matches;
        } else {
          responseText = 'Saya dapat membantu menjawab berbagai hal di dalam maupun di luar aplikasi. Untuk pertanyaan umum yang lebih luas, Anda dapat menyambungkan Assistant Cloud API Key gratis via ikon kunci di pojok kanan atas.\n\nContoh yang bisa Anda tanyakan:\n• "Aplikasi ini untuk apa saja?"\n• "Berapa saldo dan pengeluaran saya?"\n• Atau foto struk belanja untuk dicatat otomatis!';
        }
      }
    }

    if (mounted) {
      setState(() {
        _isTyping = false;
        _messages.add(
          ChatMessage(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            sender: ChatSender.assistant,
            text: responseText,
            matchItems: matches,
          ),
        );
      });
      _scrollToBottom();
    }
  }

  Future<void> _handleReceiptPhoto(ImageSource source) async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: source,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );
      if (photo == null) return;

      final imagePath = photo.path;

      // Add user message with receipt photo
      final userMsg = ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        sender: ChatSender.user,
        text: source == ImageSource.camera ? 'Foto Struk Belanja dari Kamera' : 'Foto Struk Belanja dari Galeri',
        imagePath: imagePath,
      );

      setState(() {
        _messages.add(userMsg);
        _isTyping = true;
      });
      _scrollToBottom();

      // Analyze receipt (Gemini Cloud API if key exists, else On-Device OCR)
      ReceiptExtractionResult? result;
      final apiKey = await _geminiService.getApiKey();

      if (apiKey != null && apiKey.isNotEmpty) {
        result = await _geminiService.extractReceipt(
          imageFile: File(imagePath),
          apiKey: apiKey,
        );
      }

      if (result == null) {
        final rawText = await _ocrService.recognizeTextFromPath(imagePath);
        if (rawText.trim().isNotEmpty) {
          result = _ocrService.parseReceipt(rawText);
        }
      }

      if (mounted) {
        setState(() => _isTyping = false);

        if (result != null && result.totalAmount > 0) {
          _messages.add(
            ChatMessage(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              sender: ChatSender.assistant,
              text: 'Saya berhasil menganalisis struk belanja Anda dari **${result.merchant}** sebesar **${Formatters.formatRupiah(result.totalAmount)}**.\nSilakan periksa kartu di bawah lalu ketuk tombol untuk menyimpannya ke Keuangan:',
              receiptData: result,
            ),
          );
        } else {
          _messages.add(
            ChatMessage(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              sender: ChatSender.assistant,
              text: 'Maaf, rincian struk belum dapat terbaca dengan jelas. Pastikan foto tegak lurus dan pencahayaan terang, atau Anda juga bisa memasukkan nominalnya langsung di tab Keuangan.',
            ),
          );
        }
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isTyping = false;
          _messages.add(
            ChatMessage(
              id: DateTime.now().millisecondsSinceEpoch.toString(),
              sender: ChatSender.assistant,
              text: 'Terjadi kendala saat memproses gambar: $e',
            ),
          );
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _saveReceiptToFinance(ChatMessage message) async {
    final receipt = message.receiptData;
    if (receipt == null || message.isReceiptSaved) return;

    final finance = context.read<FinanceProvider>();
    await finance.addTransaction(
      title: receipt.merchant,
      amount: receipt.totalAmount,
      type: TransactionType.expense,
      category: receipt.suggestedCategory,
      date: receipt.date,
      note: 'Auto-Catat via Chatbot Assistant',
    );

    setState(() {
      message.isReceiptSaved = true;
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.surfaceElevated,
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: AppColors.accentEmerald, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${receipt.merchant} (${Formatters.formatRupiah(receipt.totalAmount)}) berhasil dicatat ke Keuangan!',
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
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      padding: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.canvas,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1.5),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderSubtle),
                  ),
                  child: const Icon(Icons.auto_awesome, size: 18, color: AppColors.textPrimary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Assistant',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Row(
                        children: [
                          Icon(
                            _hasApiKey ? Icons.bolt_rounded : Icons.offline_bolt_outlined,
                            size: 11,
                            color: _hasApiKey ? AppColors.accentEmerald : AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _hasApiKey ? 'Cloud AI Aktif (0% Beban HP)' : 'Mode Lokal (Tersedia Cloud Key)',
                            style: TextStyle(
                              fontSize: 11,
                              color: _hasApiKey ? AppColors.accentEmerald : AppColors.textSecondary,
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
                    size: 20,
                    color: _hasApiKey ? AppColors.accentEmerald : AppColors.textSecondary,
                  ),
                  tooltip: 'Pengaturan Cloud AI',
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, size: 20, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.borderSubtle),

          // Quick Action Prompt Pills
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              children: [
                _buildPromptPill('📸 Foto Struk Belanja', () => _handleReceiptPhoto(ImageSource.camera)),
                const SizedBox(width: 8),
                _buildPromptPill('💡 Aplikasi untuk apa?', () => _handleSendMessage(customText: 'Aplikasi ini untuk apa saja?')),
                const SizedBox(width: 8),
                _buildPromptPill('💰 Cek Saldo & Pengeluaran', () => _handleSendMessage(customText: 'Berapa saldo dan pengeluaran saya?')),
                const SizedBox(width: 8),
                _buildPromptPill('🛡️ Buka Dokumen KTP', () => _handleSendMessage(customText: 'Cari KTP di brankas')),
              ],
            ),
          ),

          const Divider(height: 1, color: AppColors.borderSubtle),

          // Chat Messages Timeline
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _messages.length,
              itemBuilder: (ctx, idx) {
                final msg = _messages[idx];
                return _buildMessageItem(msg);
              },
            ),
          ),

          // Typing indicator
          if (_isTyping)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              alignment: Alignment.centerLeft,
              child: const Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.textSecondary),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'Assistant sedang menganalisis...',
                    style: TextStyle(fontSize: 12, color: AppColors.textMuted, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),

          // Chat Input Bar
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildPromptPill(String label, VoidCallback onTap) {
    return ActionChip(
      onPressed: onTap,
      backgroundColor: AppColors.surface,
      side: const BorderSide(color: AppColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
      label: Text(
        label,
        style: const TextStyle(fontSize: 11, color: AppColors.textPrimary, fontWeight: FontWeight.w500),
      ),
    );
  }

  Widget _buildMessageItem(ChatMessage msg) {
    final isUser = msg.sender == ChatSender.user;

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: const Icon(Icons.auto_awesome, size: 14, color: AppColors.textPrimary),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                // Image preview if user sent photo
                if (msg.imagePath != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      constraints: const BoxConstraints(maxHeight: 180, maxWidth: 220),
                      color: AppColors.surfaceElevated,
                      child: Image.file(
                        File(msg.imagePath!),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                ],

                // Text Bubble
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isUser ? AppColors.surfaceHover : AppColors.surface,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(14),
                      topRight: const Radius.circular(14),
                      bottomLeft: Radius.circular(isUser ? 14 : 4),
                      bottomRight: Radius.circular(isUser ? 4 : 14),
                    ),
                    border: Border.all(color: isUser ? AppColors.border : AppColors.borderSubtle),
                  ),
                  child: Text(
                    msg.text,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                ),

                // Interactive Receipt Action Card if extracted
                if (msg.receiptData != null) ...[
                  const SizedBox(height: 8),
                  _buildReceiptCard(msg),
                ],

                // Matched entities list (files, transactions, etc.)
                if (msg.matchItems != null && msg.matchItems!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ...msg.matchItems!.map((item) => _buildResultTile(item)),
                ],
              ],
            ),
          ),
          if (isUser) const SizedBox(width: 4),
        ],
      ),
    );
  }

  Widget _buildReceiptCard(ChatMessage msg) {
    final receipt = msg.receiptData!;

    return Container(
      constraints: const BoxConstraints(maxWidth: 280),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.receipt_long_rounded, size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  receipt.merchant,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Text(
                  receipt.suggestedCategory,
                  style: const TextStyle(fontSize: 10, color: AppColors.accentSky),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Divider(height: 1, color: AppColors.borderSubtle),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Pembayaran', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
              Text(
                Formatters.formatRupiah(receipt.totalAmount),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.accentEmerald),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Tanggal', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
              Text(
                Formatters.formatDate(receipt.date),
                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: msg.isReceiptSaved ? null : () => _saveReceiptToFinance(msg),
              icon: Icon(
                msg.isReceiptSaved ? Icons.check_circle_rounded : Icons.add_circle_outline_rounded,
                size: 15,
                color: msg.isReceiptSaved ? AppColors.accentEmerald : AppColors.canvas,
              ),
              label: Text(
                msg.isReceiptSaved ? 'Tersimpan di Keuangan' : 'Masukkan ke Keuangan',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: msg.isReceiptSaved ? AppColors.accentEmerald : AppColors.canvas,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: msg.isReceiptSaved ? AppColors.surface : AppColors.textPrimary,
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultTile(AssistantMatchItem item) {
    IconData icon;
    Color iconColor;

    switch (item.type) {
      case AssistantResultType.deviceFile:
        icon = Icons.description_rounded;
        iconColor = AppColors.accentSky;
        break;
      case AssistantResultType.vaultItem:
        icon = Icons.shield_rounded;
        iconColor = AppColors.accentAmber;
        break;
      case AssistantResultType.transaction:
        icon = Icons.payments_rounded;
        iconColor = AppColors.accentEmerald;
        break;
      case AssistantResultType.task:
        icon = Icons.task_alt_rounded;
        iconColor = AppColors.textPrimary;
        break;
      case AssistantResultType.habit:
        icon = Icons.repeat_rounded;
        iconColor = AppColors.accentPurple;
        break;
      case AssistantResultType.generalInfo:
        icon = Icons.info_outline_rounded;
        iconColor = AppColors.accentSky;
        break;
    }

    return Container(
      margin: const EdgeInsets.only(top: 6),
      constraints: const BoxConstraints(maxWidth: 300),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: ListTile(
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
        leading: Icon(icon, color: iconColor, size: 18),
        title: Text(
          item.title,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          item.subtitle,
          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        onTap: () async {
          if (item.type == AssistantResultType.deviceFile && item.actionData != null) {
            try {
              await OpenFilex.open(item.actionData!);
            } catch (_) {}
          } else if (item.type == AssistantResultType.transaction) {
            Navigator.pop(context);
            widget.onNavigateTab(1);
          } else if (item.type == AssistantResultType.task || item.type == AssistantResultType.habit) {
            Navigator.pop(context);
            widget.onNavigateTab(2);
          } else if (item.type == AssistantResultType.vaultItem) {
            Navigator.pop(context);
            widget.onNavigateTab(3);
          }
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border, width: 1)),
      ),
      child: Row(
        children: [
          // Camera Button to take photo of receipt directly
          IconButton(
            onPressed: () => _handleReceiptPhoto(ImageSource.camera),
            icon: const Icon(Icons.camera_alt_outlined, color: AppColors.textPrimary, size: 20),
            tooltip: 'Ambil Foto Struk (Kamera)',
          ),
          IconButton(
            onPressed: () => _handleReceiptPhoto(ImageSource.gallery),
            icon: const Icon(Icons.photo_library_outlined, color: AppColors.textSecondary, size: 20),
            tooltip: 'Pilih Foto Struk (Galeri)',
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: _inputCtrl,
                style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Tanya panduan atau kirim struk...',
                  hintStyle: TextStyle(fontSize: 12, color: AppColors.textMuted),
                  border: InputBorder.none,
                ),
                onSubmitted: (_) => _handleSendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _handleSendMessage,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.textPrimary,
              foregroundColor: AppColors.canvas,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              padding: const EdgeInsets.all(8),
            ),
            icon: const Icon(Icons.arrow_upward_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}
