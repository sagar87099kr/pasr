import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/api_service.dart';
import 'CartPage.dart';
import 'LoginPage.dart';
import '../widgets/ProfileCompletionSheet.dart';
import 'dart:convert';

class ItemDetailPage extends StatefulWidget {
  final String itemId;
  const ItemDetailPage({super.key, required this.itemId});

  @override
  State<ItemDetailPage> createState() => _ItemDetailPageState();
}

class _ItemDetailPageState extends State<ItemDetailPage> {
  bool _isLoading = true;
  String _error = '';
  Map<String, dynamic>? _itemData;
  Map<String, dynamic>? _shopData;
  int _quantity = 1;
  bool _isAddingToCart = false;
  
  // Review state
  int _rating = 5;
  final TextEditingController _reviewBodyCtrl = TextEditingController();
  bool _isSubmittingReview = false;

  @override
  void initState() {
    super.initState();
    _fetchItemDetails();
  }

  Future<void> _fetchItemDetails() async {
    try {
      final res = await ApiService.get('/items/${widget.itemId}');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          setState(() {
            _itemData = data['item'];
            _shopData = data['shop'];
            _isLoading = false;
          });
        } else {
          setState(() {
            _error = data['message'] ?? 'Failed to load item';
            _isLoading = false;
          });
        }
      } else {
        setState(() {
          _error = 'Error loading item';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _addToCart({required bool buyNow}) async {
    if (_itemData == null || _shopData == null) return;
    setState(() => _isAddingToCart = true);

    try {
      final productObj = _itemData!['product'] ?? _itemData!;
      final itemName = productObj['name'] ?? _itemData!['name'];
      final price = _itemData!['price'];
      
      List images = [];
      if (productObj['img'] != null) images = [productObj['img']];
      else if (_itemData!['img'] != null) images = [_itemData!['img']];
      final itemImg = images.isNotEmpty ? images[0]['url'] : '';

      final res = await ApiService.post('/api/cart/add', {
        'itemId': widget.itemId,
        'itemName': itemName,
        'itemImage': itemImg,
        'price': price,
        'shopId': _shopData!['_id'],
        'shopName': _shopData!['shopName'],
        'quantity': _quantity,
      });

      setState(() => _isAddingToCart = false);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success']) {
          if (buyNow) {
            Navigator.push(context, MaterialPageRoute(builder: (context) => const CartPage()));
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Item added to cart!'),
                backgroundColor: Colors.green,
                action: SnackBarAction(
                  label: 'Go to Cart',
                  textColor: Colors.white,
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const CartPage()));
                  },
                ),
              ),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(data['message'] ?? 'Failed to add to cart'), backgroundColor: Colors.red),
          );
        }
      } else if (res.statusCode == 401) {
        // Not logged in
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please log in to add items to cart'), backgroundColor: Colors.red),
        );
        
        final loggedIn = await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LoginPage(returnToPrevious: true)),
        );
        
        if (loggedIn == true) {
          _addToCart(buyNow: buyNow);
        }
      }
    } catch (e) {
      setState(() => _isAddingToCart = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _submitReview() async {
    if (_reviewBodyCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write a review first'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isSubmittingReview = true);

    try {
      final res = await ApiService.post('/items/${widget.itemId}/reviews', {
        'review': {
          'rating': _rating,
          'body': _reviewBodyCtrl.text.trim(),
        }
      });

      setState(() => _isSubmittingReview = false);

      if (res.statusCode == 200 || res.statusCode == 201) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Review added successfully!'), backgroundColor: Colors.green),
        );
        _reviewBodyCtrl.clear();
        _fetchItemDetails(); // Refresh to show new review
      } else if (res.statusCode == 401) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please log in to submit a review'), backgroundColor: Colors.red),
        );
        final loggedIn = await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LoginPage(returnToPrevious: true)),
        );
        if (loggedIn == true) _submitReview();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to submit review'), backgroundColor: Colors.red),
        );
      }
    } catch (e) {
      setState(() => _isSubmittingReview = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Network error'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildReviewsSection() {
    final reviews = _itemData?['reviews'] as List? ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 32),
        const Divider(),
        const SizedBox(height: 16),
        Text('Customer Reviews (${reviews.length})', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF1E293B))),
        const SizedBox(height: 16),
        
        // Write a review form
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Write a Review', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Row(
                children: List.generate(5, (index) {
                  return IconButton(
                    icon: Icon(
                      index < _rating ? Icons.star : Icons.star_border,
                      color: const Color(0xFFF59E0B),
                    ),
                    onPressed: () => setState(() => _rating = index + 1),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _reviewBodyCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Share your experience...',
                  hintStyle: GoogleFonts.outfit(color: const Color(0xFF94A3B8)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  contentPadding: const EdgeInsets.all(12),
                  fillColor: Colors.white,
                  filled: true,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmittingReview ? null : _submitReview,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _isSubmittingReview 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text('Submit Review', style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 24),
        
        // Reviews List
        if (reviews.isEmpty)
          Text('No reviews yet. Be the first to review!', style: GoogleFonts.outfit(color: const Color(0xFF64748B)))
        else
          ...reviews.map((r) {
            final authorName = r['author']?['name'] ?? 'Unknown User';
            final rating = r['rating'] ?? 5;
            final body = r['body'] ?? '';
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(authorName, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: const Color(0xFF334155))),
                      Row(
                        children: List.generate(5, (index) => Icon(
                          index < rating ? Icons.star : Icons.star_border,
                          size: 14, color: const Color(0xFFF59E0B),
                        )),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(body, style: GoogleFonts.outfit(color: const Color(0xFF475569))),
                  const SizedBox(height: 8),
                  const Divider(color: Color(0xFFF1F5F9)),
                ],
              ),
            );
          }),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error.isNotEmpty || _itemData == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Item Details')),
        body: Center(child: Text(_error)),
      );
    }

    final productObj = _itemData!['product'] ?? _itemData!;
    final itemName = productObj['name'] ?? _itemData!['name'];
    final itemDesc = productObj['description'] ?? _itemData!['description'] ?? 'No description available.';
    final itemCat = productObj['category'] ?? _itemData!['itemCategory'] ?? 'General';
    final price = _itemData!['price'];
    final discount = _itemData!['discount'] ?? 0;
    final stock = _itemData!['quantity'] ?? 0;
    
    List images = [];
    if (productObj['img'] != null) images = [productObj['img']];
    else if (_itemData!['img'] != null) images = [_itemData!['img']];
    final itemImg = images.isNotEmpty ? images[0]['url'] : null;

    final shopName = _shopData!['shopName'];
    
    // Check shop open status
    bool shopIsCurrentlyOpen = false;
    if (_shopData!['isActive'] == true && _shopData!['isHoliday'] == false) {
      shopIsCurrentlyOpen = true; 
      
      final String? openTime = _shopData!['openingTime'];
      final String? closeTime = _shopData!['closingTime'];
      
      if (openTime != null && closeTime != null && openTime.isNotEmpty && closeTime.isNotEmpty) {
        final now = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
        final nowStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
        
        if (nowStr.compareTo(openTime) < 0 || nowStr.compareTo(closeTime) > 0) {
          shopIsCurrentlyOpen = false;
        }
      }
    }

    int actualPrice = price;
    if (discount > 0) {
      actualPrice = (price * (1 - discount / 100)).round();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Product Details', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF1E3A8A),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Area
            Container(
              width: double.infinity,
              height: 300,
              color: Colors.white,
              child: itemImg != null
                  ? CachedNetworkImage(
                      imageUrl: itemImg,
                      fit: BoxFit.contain,
                    )
                  : const Icon(Icons.image, size: 80, color: Colors.grey),
            ),
            
            // Details Area
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(itemName, style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  
                  Row(
                    children: [
                      const Icon(Icons.store, size: 16, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Text('Sold by $shopName', style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF1E3A8A), fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  Row(
                    children: [
                      Text('₹$actualPrice', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: const Color(0xFF10B981))),
                      if (discount > 0) ...[
                        const SizedBox(width: 8),
                        Text('₹$price', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w600, color: const Color(0xFF94A3B8), decoration: TextDecoration.lineThrough)),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(8)),
                          child: Text('$discount% OFF', style: GoogleFonts.outfit(color: const Color(0xFF16A34A), fontSize: 12, fontWeight: FontWeight.w800)),
                        )
                      ]
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Info Grid
                  Row(
                    children: [
                      _buildInfoBox('Stock', stock > 0 ? '$stock Available' : 'Out of Stock', stock > 0 ? const Color(0xFF16A34A) : Colors.red),
                      const SizedBox(width: 12),
                      _buildInfoBox('Category', itemCat, const Color(0xFF475569)),
                    ],
                  ),
                  
                  const SizedBox(height: 24),
                  Text('Description', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF1E293B))),
                  const SizedBox(height: 8),
                  Text(itemDesc, style: GoogleFonts.outfit(fontSize: 15, color: const Color(0xFF64748B), height: 1.5)),
                  
                  _buildReviewsSection(),
                  
                  const SizedBox(height: 100), // Space for bottom bar
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5))],
        ),
        child: SafeArea(
          child: stock > 0 && shopIsCurrentlyOpen ? Row(
            children: [
              // Qty
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove, size: 20),
                      onPressed: () {
                        if (_quantity > 1) setState(() => _quantity--);
                      },
                    ),
                    Text('$_quantity', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700)),
                    IconButton(
                      icon: const Icon(Icons.add, size: 20),
                      onPressed: () {
                        if (_quantity < stock) setState(() => _quantity++);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isAddingToCart ? null : () => ProfileCompletionSheet.checkAndShow(context, () => _addToCart(buyNow: false)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E293B),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isAddingToCart 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text('Add to Cart', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isAddingToCart ? null : () => ProfileCompletionSheet.checkAndShow(context, () => _addToCart(buyNow: true)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text('Buy Now', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ],
          ) : Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
            child: Text(
              stock <= 0 ? 'Out of Stock' : 'Shop is Closed',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFFDC2626)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoBox(String label, String value, Color valueColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(value, style: GoogleFonts.outfit(fontSize: 14, color: valueColor, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}
