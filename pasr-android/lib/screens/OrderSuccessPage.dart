import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'dart:async';
import '../services/api_service.dart';
import 'MyOrdersPage.dart';

class OrderSuccessPage extends StatefulWidget {
  final String orderId;
  final String orderDbId;
  final String imageUrl;
  final String shopOwnerPhone;
  final String paymentType;
  final String itemsSummary;

  const OrderSuccessPage({
    super.key,
    required this.orderId,
    required this.orderDbId,
    required this.imageUrl,
    required this.shopOwnerPhone,
    required this.paymentType,
    required this.itemsSummary,
  });

  @override
  State<OrderSuccessPage> createState() => _OrderSuccessPageState();
}

class _OrderSuccessPageState extends State<OrderSuccessPage> {
  bool _isCancelling = false;
  bool _isCancelled = false;
  Timer? _redirectTimer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _redirectTimer = Timer(const Duration(seconds: 5), () {
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const MyOrdersPage()),
        );
      }
    });
  }

  @override
  void dispose() {
    _redirectTimer?.cancel();
    super.dispose();
  }

  Future<void> _notifyShopkeeper() async {
    _redirectTimer?.cancel();
    final phone = '91${widget.shopOwnerPhone}';
    String message = '📦 Order #${widget.orderId} (${widget.itemsSummary})\n';
    if (widget.imageUrl.isNotEmpty) {
      message += 'Image: ${widget.imageUrl}\n';
    }
    if (widget.paymentType == 'COD') {
      message += 'मुझे सामान घर चाहिए, पहुँचने पर पैसे दूँगा।\nI want products at home, will pay on delivery.';
    } else {
      message += 'मैंने ऑनलाइन पैसे भेज दिए हैं, सामान घर भेज दें।\nI paid online, please send my products home.';
    }
    
    final Uri url = Uri.parse('https://wa.me/$phone?text=${Uri.encodeComponent(message)}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _cancelOrder() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Cancel Order', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        content: Text('Are you sure you want to cancel this order?', style: GoogleFonts.outfit()),
        actions: [
          TextButton(
            onPressed: () {
               Navigator.pop(context, false);
               _startTimer(); // resume timer if they clicked no
            },
            child: Text('No', style: GoogleFonts.outfit(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white, elevation: 0),
            child: Text('Yes, Cancel', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isCancelling = true);

    try {
      final res = await ApiService.post('/api/orders/${widget.orderDbId}/cancel', {});
      if (res.statusCode == 200) {
        setState(() => _isCancelled = true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order cancelled successfully'), backgroundColor: Colors.green),
          );
        }
      } else {
        final data = jsonDecode(res.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['message'] ?? 'Failed to cancel order'), backgroundColor: Colors.red),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Network error'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCancelling = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {


    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        automaticallyImplyLeading: false, // Prevent back button
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: _isCancelled ? const Color(0xFFFEE2E2) : const Color(0xFFECFDF5),
                  shape: BoxShape.circle,
                ),
                child: Icon(_isCancelled ? Icons.close : Icons.check, size: 50, color: _isCancelled ? const Color(0xFFDC2626) : const Color(0xFF10B981)),
              ),
              const SizedBox(height: 24),
              Text(
                _isCancelled ? 'Order Cancelled' : 'Order Placed!',
                style: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.w800, color: _isCancelled ? const Color(0xFF991B1B) : const Color(0xFF065F46)),
              ),
              const SizedBox(height: 12),
              Text(
                _isCancelled ? 'Your order #${widget.orderId} has been cancelled.' : 'Your order #${widget.orderId} has been received by the shop.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(fontSize: 16, color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 48),
              
              if (!_isCancelled)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _notifyShopkeeper,
                    icon: const Icon(Icons.message, color: Colors.white),
                    label: Text('Notify Shopkeeper', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25D366), // WhatsApp Green
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              if (!_isCancelled) const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () {
                    _redirectTimer?.cancel();
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (context) => const MyOrdersPage()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    side: const BorderSide(color: Color(0xFFE2E8F0), width: 2),
                  ),
                  child: Text('My Orders', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF475569))),
                ),
              ),
              if (!_isCancelled) const SizedBox(height: 16),
              if (!_isCancelled)
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: _isCancelling ? null : _cancelOrder,
                    child: _isCancelling
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.red))
                        : Text('Cancel Order', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.red)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
