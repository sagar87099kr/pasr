import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import '../services/api_service.dart';

class MyOrdersPage extends StatefulWidget {
  const MyOrdersPage({super.key});

  @override
  State<MyOrdersPage> createState() => _MyOrdersPageState();
}

class _MyOrdersPageState extends State<MyOrdersPage> {
  bool _isLoading = true;
  String _error = '';
  List<dynamic> _orders = [];

  @override
  void initState() {
    super.initState();
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      final res = await ApiService.get('/api/orders/my-orders');
      if (!mounted) return;
      
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          setState(() {
            _orders = data['orders'] ?? [];
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = data['message'] ?? 'Failed to load orders';
            _isLoading = false;
          });
        }
      } else {
        setState(() {
          _error = 'Failed to load orders. Status: ${res.statusCode}';
          _isLoading = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Network error: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _cancelOrder(String orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Cancel Order', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        content: Text('Are you sure you want to cancel this order?', style: GoogleFonts.outfit()),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text('No', style: GoogleFonts.outfit(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white, elevation: 0),
            child: Text('Yes, Cancel', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm != true) return;
    if (!mounted) return;

    // Capture the navigator to safely pop the dialog later even if unmounted
    final navigator = Navigator.of(context, rootNavigator: true);

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final res = await ApiService.post('/api/orders/$orderId/cancel', {});
      
      // Always hide loading dialog first
      navigator.pop();

      if (!mounted) return;

      if (res.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order cancelled successfully'), backgroundColor: Colors.green),
        );
        _fetchOrders(); // Refresh the list
      } else {
        final data = jsonDecode(res.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? 'Failed to cancel order'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      navigator.pop(); // Hide loading
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error'), backgroundColor: Colors.red),
      );
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'CREATED': return const Color(0xFF0EA5E9);
      case 'ACCEPTED': return const Color(0xFF3B82F6);
      case 'READY_FOR_DELIVERY': return const Color(0xFFF59E0B);
      case 'ASSIGNED': return const Color(0xFF06B6D4);
      case 'OUT_FOR_DELIVERY': return const Color(0xFF6366F1);
      case 'COMPLETED': return const Color(0xFF10B981);
      case 'CANCELLED': return const Color(0xFFEF4444);
      default: return const Color(0xFF64748B);
    }
  }

  Widget _buildSummaryRow(String label, Widget valueWidget) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.outfit(fontSize: 15, color: const Color(0xFF475569))),
          valueWidget,
        ],
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final sellerName = order['resolvedSeller']?['name'] ?? 'Market Item';
    final dateString = order['createdAt'] ?? '';
    
    String formattedDate = '';
    if (dateString.isNotEmpty) {
      final d = DateTime.parse(dateString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      formattedDate = '${d.day} ${months[d.month - 1]} ${d.year}';
    }
        
    final items = order['items'] as List? ?? [];
    final status = order['orderStatus'] ?? 'CREATED';
    final deliveryType = order['deliveryType'] ?? 'HOME_DELIVERY';
    
    final bool canCancel = !['PACKED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'].contains(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.storefront, color: Color(0xFF1E3A8A), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(sellerName, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(formattedDate, style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF64748B))),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF1F5F9), height: 1),
          const SizedBox(height: 16),
          
          // Items List
          ...items.map((item) {
            final qty = item['quantity'] ?? 1;
            final price = item['price'] ?? 0;
            final img = item['imageUrl'] ?? item['image'] ?? '';
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    width: 60, height: 60,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFF1F5F9)),
                      image: img.isNotEmpty ? DecorationImage(image: NetworkImage(img), fit: BoxFit.cover) : null,
                    ),
                    child: img.isEmpty ? const Icon(Icons.image, color: Colors.grey) : null,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item['name'] ?? 'Unknown Item', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)), maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text('₹${price * qty} (Qty: $qty)', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF10B981))),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
          
          const SizedBox(height: 8),
          
          // Summary Details Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                _buildSummaryRow(
                  'Status', 
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: _getStatusColor(status).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                    child: Text(status.replaceAll('_', ' '), style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w800, color: _getStatusColor(status))),
                  )
                ),
                _buildSummaryRow(
                  'Delivery Target', 
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(6)),
                    child: Text(deliveryType == 'SELF_PICKUP' ? '🏪 Self Pickup' : '🚚 Home Delivery', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF334155))),
                  )
                ),
                _buildSummaryRow(
                  'Delivery Charge',
                  Row(
                    children: [
                      if (order['firstOrderDiscount'] != null && order['firstOrderDiscount'] > 0) ...[
                        Text('₹${order['firstOrderDiscount']}', style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF94A3B8), decoration: TextDecoration.lineThrough)),
                        const SizedBox(width: 4),
                        Text('FREE 🎉', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF10B981))),
                      ] else ...[
                        Text('₹${order['deliveryCharge'] ?? 0}', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
                      ]
                    ],
                  )
                ),
                _buildSummaryRow(
                  'Payment', 
                  Text('${order['paymentType'] ?? 'COD'} (${order['paymentStatus'] ?? 'PENDING'})', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
                ),
                if (status != 'COMPLETED' && status != 'CANCELLED' && order['deliveryOTP'] != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8, bottom: 8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Delivery OTP', style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF64748B))),
                          Text('${order['deliveryOTP']}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: 2, color: const Color(0xFF0F172A))),
                        ],
                      ),
                    ),
                  ),
                if (order['coinDiscount'] != null && order['coinDiscount'] > 0)
                  _buildSummaryRow(
                    'Coin Discount', 
                    Text('-₹${order['coinDiscount']}', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF10B981))),
                  ),
                const SizedBox(height: 8),
                const Divider(color: Color(0xFFCBD5E1), height: 1),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Order Total', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                    Text('₹${order['totalAmount'] ?? 0}', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF10B981))),
                  ],
                ),
              ],
            ),
          ),
          
          if (canCancel) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => _cancelOrder(order['_id']),
                icon: const Icon(Icons.close, color: Colors.red, size: 18),
                label: Text('Cancel Order', style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: Colors.red)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: const BorderSide(color: Color(0xFFFECACA), width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ]
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Text('My Orders', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E3A8A),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty
              ? Center(child: Text(_error, style: GoogleFonts.outfit(color: Colors.red)))
              : _orders.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.inbox, size: 80, color: Colors.grey),
                          const SizedBox(height: 16),
                          Text('No Orders Yet', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: const Color(0xFF334155))),
                          const SizedBox(height: 8),
                          Text('Looks like you haven\'t placed any orders.', style: GoogleFonts.outfit(color: const Color(0xFF64748B))),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchOrders,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        itemBuilder: (context, index) {
                          return _buildOrderCard(_orders[index]);
                        },
                      ),
                    ),
    );
  }
}
