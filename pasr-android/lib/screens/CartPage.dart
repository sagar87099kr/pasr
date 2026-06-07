import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:convert';
import '../services/api_service.dart';
import 'AddressSearchPage.dart';
import 'MyOrdersPage.dart';
import '../widgets/ProfileCompletionSheet.dart';

class CartPage extends StatefulWidget {
  const CartPage({super.key});

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  bool _isLoading = true;
  String _error = '';
  
  Map<String, dynamic> _cartData = {};
  
  // Per-shop selections
  // deliveryType: 'SELF_PICKUP' or 'HOME_DELIVERY'
  final Map<String, String> _deliveryTypes = {};
  final Map<String, bool> _useCoins = {};
  final Map<String, dynamic> _shopLocations = {};
  final Map<String, Map<String, dynamic>> _deliveryFees = {};

  // For simplicity, we fetch User's current address on load
  String? _userAddress;
  double? _userLat;
  double? _userLng;
  int _userCoins = 0;

  @override
  void initState() {
    super.initState();
    _fetchCartAndUser();
  }

  Future<void> _fetchCartAndUser() async {
    try {
      // Use the generic index to see if it returns currUser data if we want.
      // But we can just rely on cart first.
      final res = await ApiService.get('/api/cart');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          setState(() {
            _cartData = data['cart'] ?? {};
            _userCoins = data['coins'] ?? 0;
            _isLoading = false;
          });
          _initShopStates();
        } else {
          setState(() {
            _error = data['message'] ?? 'Failed to load cart';
            _isLoading = false;
          });
        }
      } else if (res.statusCode == 401) {
        setState(() {
          _error = 'Please login to view your cart';
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Error loading cart';
          _isLoading = false;
        });
      }
      
      // Attempt to get user info for default address and coins (from some endpoint)
      // /api/auth/me or similar? We can just leave it empty and force them to enter address if they want delivery.
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _initShopStates() {
    if (_cartData.isEmpty || _cartData['items'] == null) return;
    
    final items = _cartData['items'] as List;
    for (var item in items) {
      final shopId = item['shopId'];
      if (!_deliveryTypes.containsKey(shopId)) {
        _deliveryTypes[shopId] = 'SELF_PICKUP';
        _useCoins[shopId] = false;
      }
    }
  }

  Map<String, List<dynamic>> _getGroupedItems() {
    final Map<String, List<dynamic>> groups = {};
    if (_cartData.isEmpty || _cartData['items'] == null) return groups;
    
    for (var item in (_cartData['items'] as List)) {
      final shopId = item['shopId'];
      if (!groups.containsKey(shopId)) {
        groups[shopId] = [];
      }
      groups[shopId]!.add(item);
    }
    return groups;
  }

  Future<void> _updateQuantity(String itemId, String action) async {
    final res = await ApiService.put('/api/cart/update/$itemId', {'action': action});
    if (res.statusCode == 200) {
      _fetchCartAndUser();
    }
  }

  Future<void> _removeItem(String itemId) async {
    final res = await ApiService.delete('/api/cart/remove/$itemId');
    if (res.statusCode == 200) {
      _fetchCartAndUser();
    }
  }

  Future<void> _calculateDeliveryFee(String shopId, double lat, double lng) async {
    final res = await ApiService.post('/api/cart/delivery-fee', {
      'lat': lat,
      'lng': lng,
      'shopId': shopId,
    });
    
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      setState(() {
        _deliveryFees[shopId] = data;
      });
    } else {
      final data = jsonDecode(res.body);
      setState(() {
        _deliveryFees[shopId] = {'error': data['message'] ?? 'Delivery unavailable'};
      });
    }
  }

  Future<void> _openAddressSearch(String shopId) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AddressSearchPage()),
    );

    if (result != null && result is Map) {
      setState(() {
        _shopLocations[shopId] = {
          'address': result['address'],
          'lat': result['lat'],
          'lng': result['lng'],
        };
      });
      _calculateDeliveryFee(shopId, result['lat'], result['lng']);
    }
  }

  bool _isCheckingOut = false;

  Future<void> _checkout(String shopId, String shopName, List<dynamic> items) async {
    if (_isCheckingOut) return;
    
    final deliveryType = _deliveryTypes[shopId]!;
    
    if (deliveryType == 'HOME_DELIVERY') {
      if (!_shopLocations.containsKey(shopId)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a delivery address')),
        );
        return;
      }
      final feeData = _deliveryFees[shopId];
      if (feeData == null || feeData['error'] != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Delivery not available for selected address')),
        );
        return;
      }
    }

    setState(() => _isCheckingOut = true);

    // Capture navigator to safely pop the dialog later
    final navigator = Navigator.of(context, rootNavigator: true);

    // Show loading
    showDialog(
      context: context, 
      barrierDismissible: false,
      builder: (c) => const Center(child: CircularProgressIndicator())
    );

    try {
      final loc = _shopLocations[shopId];
      final res = await ApiService.post('/api/orders/checkout', {
        'paymentType': 'COD',
        'shopId': shopId,
        'deliveryType': deliveryType,
        'useCoins': _useCoins[shopId],
        if (deliveryType == 'HOME_DELIVERY') 'lat': loc['lat'],
        if (deliveryType == 'HOME_DELIVERY') 'lng': loc['lng'],
      });

      // Hide loading
      navigator.pop();

      if (!mounted) return;
      setState(() => _isCheckingOut = false);

      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = jsonDecode(res.body);
        if (data['success']) {
          
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const MyOrdersPage()
            )
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['message'] ?? 'Failed to place order')),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to place order. Server error.')),
        );
      }
    } catch (e) {
      navigator.pop(); // Hide loading
      if (mounted) {
        setState(() => _isCheckingOut = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error.isNotEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Cart')),
        body: Center(child: Text(_error)),
      );
    }

    final groups = _getGroupedItems();
    
    if (groups.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: Text('My Cart', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF1E3A8A),
          elevation: 0,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.shopping_cart_outlined, size: 80, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Your cart is empty', style: GoogleFonts.outfit(fontSize: 20, color: Colors.grey[600])),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Text('My Cart', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E3A8A),
        elevation: 0,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: groups.keys.length,
        itemBuilder: (context, index) {
          final shopId = groups.keys.elementAt(index);
          final items = groups[shopId]!;
          final shopName = items[0]['shopName'] ?? 'Local Shop';
          
          return _buildShopSection(shopId, shopName, items);
        },
      ),
    );
  }

  Widget _buildShopSection(String shopId, String shopName, List<dynamic> items) {
    double subtotal = 0;
    for (var item in items) {
      subtotal += item['price'] * item['quantity'];
    }

    final deliveryType = _deliveryTypes[shopId]!;
    final feeData = _deliveryFees[shopId];
    
    double deliveryFee = 0;
    if (deliveryType == 'HOME_DELIVERY' && feeData != null && feeData['success'] == true) {
      deliveryFee = (feeData['effectiveDeliveryCharge'] ?? 0).toDouble();
    }
    
    double grandTotal = subtotal + deliveryFee;
    
    int coinDiscount = 0;
    if (_userCoins > 0) {
      coinDiscount = _userCoins > grandTotal ? grandTotal.toInt() : _userCoins;
      if (_useCoins[shopId] == true) {
        grandTotal -= coinDiscount;
      }
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Shop Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.store, color: Color(0xFF1E3A8A)),
                const SizedBox(width: 8),
                Expanded(child: Text(shopName, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                  child: Text('${items.length} items', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          
          // Items
          ...items.map((item) => _buildCartItem(item)).toList(),
          
          // Summary & Checkout
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.only(bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Delivery Option', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _deliveryTypes[shopId] = 'SELF_PICKUP'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: deliveryType == 'SELF_PICKUP' ? const Color(0xFFEEF2FF) : Colors.white,
                            border: Border.all(color: deliveryType == 'SELF_PICKUP' ? const Color(0xFF6366F1) : const Color(0xFFE2E8F0), width: 2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text('🏪 Self Pickup', style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: deliveryType == 'SELF_PICKUP' ? const Color(0xFF4338CA) : const Color(0xFF475569))),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Home Delivery is coming soon!')),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text('🚚 Home Delivery\n(Coming Soon)', textAlign: TextAlign.center, style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8))),
                        ),
                      ),
                    ),
                  ],
                ),
                
                if (deliveryType == 'HOME_DELIVERY') ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFF6366F1), style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Deliver to:', style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 12, color: const Color(0xFF64748B))),
                        const SizedBox(height: 4),
                        Text(
                          _shopLocations.containsKey(shopId) ? _shopLocations[shopId]!['address'] : 'No address selected',
                          style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () => _openAddressSearch(shopId),
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            child: const Text('Change Address'),
                          ),
                        ),
                        if (feeData != null && feeData['error'] != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Text(feeData['error'], style: GoogleFonts.outfit(color: Colors.red, fontSize: 12)),
                          )
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 16),
                _buildSummaryRow('Subtotal', '₹$subtotal'),
                if (deliveryType == 'HOME_DELIVERY' && feeData != null && feeData['success'] == true) ...[
                  const SizedBox(height: 8),
                  _buildSummaryRow('Delivery Fee', feeData['effectiveDeliveryCharge'] == 0 ? 'FREE' : '₹${feeData['effectiveDeliveryCharge']}'),
                ],
                if (_userCoins > 0) ...[
                  const SizedBox(height: 8),
                  if (_useCoins[shopId] == true)
                    _buildSummaryRow('Coin Discount', '-₹$coinDiscount', valueColor: Colors.green),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: CheckboxListTile(
                        value: _useCoins[shopId],
                        onChanged: (val) {
                          setState(() => _useCoins[shopId] = val ?? false);
                        },
                        title: Text('Use PaSr Coins (Balance: $_userCoins)', style: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 14)),
                        activeColor: const Color(0xFFF59E0B),
                        checkColor: Colors.white,
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                        dense: true,
                      ),
                    ),
                  ),
                ],
                const Divider(height: 24),
                _buildSummaryRow('Order Total', '₹$grandTotal', isTotal: true),
                
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => ProfileCompletionSheet.checkAndShow(context, () => _checkout(shopId, shopName, items)),
                    icon: const Icon(Icons.store, color: Colors.white),
                    label: Text(deliveryType == 'HOME_DELIVERY' ? 'Pay Directly to Shop (COD)' : 'Pay Directly to Shop', 
                      style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.outfit(
          fontSize: isTotal ? 16 : 14, 
          fontWeight: isTotal ? FontWeight.w800 : FontWeight.w600,
          color: isTotal ? const Color(0xFF0F172A) : const Color(0xFF475569)
        )),
        Text(value, style: GoogleFonts.outfit(
          fontSize: isTotal ? 18 : 14, 
          fontWeight: isTotal ? FontWeight.w800 : FontWeight.w700,
          color: valueColor ?? (isTotal ? const Color(0xFF10B981) : const Color(0xFF0F172A))
        )),
      ],
    );
  }

  Widget _buildCartItem(dynamic item) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: item['image'] != null && item['image'].toString().isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: item['image'],
                    width: 60,
                    height: 60,
                    fit: BoxFit.cover,
                  )
                : Container(width: 60, height: 60, color: Colors.grey[200], child: const Icon(Icons.image, color: Colors.grey)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['name'], style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 16), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text('₹${item['price']}', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: const Color(0xFF10B981))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              IconButton(
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                icon: const Icon(Icons.delete_outline, color: Colors.red),
                onPressed: () => _removeItem(item['itemId']),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => _updateQuantity(item['itemId'], 'decrease'),
                      child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.remove, size: 16)),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text('${item['quantity']}', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
                    ),
                    InkWell(
                      onTap: () => _updateQuantity(item['itemId'], 'increase'),
                      child: const Padding(padding: EdgeInsets.all(4), child: Icon(Icons.add, size: 16)),
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
}
