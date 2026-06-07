import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import '../utils/constants.dart';
import 'ItemDetailPage.dart';
import 'SearchPage.dart';

class ShopDetailPage extends StatefulWidget {
  final String shopId;

  const ShopDetailPage({super.key, required this.shopId});

  @override
  State<ShopDetailPage> createState() => _ShopDetailPageState();
}

class _ShopDetailPageState extends State<ShopDetailPage> {
  bool _isLoading = true;
  bool _apiError = false;
  Map<String, dynamic> _shop = {};
  List _displayItems = [];
  List _availableCategories = [];
  String _selectedCategory = 'All';

  @override
  void initState() {
    super.initState();
    _fetchShopDetails();
  }

  Future<void> _fetchShopDetails() async {
    setState(() {
      _isLoading = true;
      _apiError = false;
    });
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/shops/${widget.shopId}'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 15));
      
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true) {
          setState(() {
            _shop = json['shop'] ?? {};
            _displayItems = json['displayItems'] ?? [];
            _availableCategories = json['availableCategories'] ?? [];
            _isLoading = false;
          });
        } else {
          setState(() { _isLoading = false; _apiError = true; });
        }
      } else {
        setState(() { _isLoading = false; _apiError = true; });
      }
    } catch (e) {
      setState(() { _isLoading = false; _apiError = true; });
    }
  }

  Future<void> _launchUrl(String urlString) async {
    final Uri url = Uri.parse(urlString);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not launch action')));
      }
    }
  }

  bool _isShopOpen() {
    if (_shop['isHoliday'] == true) return false;
    if (_shop['isActive'] == false) return false;
    
    final openTime = _shop['openingTime'] as String?;
    final closeTime = _shop['closingTime'] as String?;
    
    if (openTime != null && closeTime != null) {
      try {
        final now = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30)); // IST
        final oh = int.parse(openTime.split(':')[0]);
        final om = int.parse(openTime.split(':')[1]);
        final ch = int.parse(closeTime.split(':')[0]);
        final cm = int.parse(closeTime.split(':')[1]);
        
        final nowMin = now.hour * 60 + now.minute;
        final openMin = oh * 60 + om;
        final closeMin = ch * 60 + cm;
        
        return nowMin >= openMin && nowMin < closeMin;
      } catch (e) {
        return true;
      }
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        title: Text(_shop['shopName'] ?? 'Shop Detail', style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontWeight: FontWeight.w800)),
        iconTheme: const IconThemeData(color: Color(0xFF0F172A)),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => SearchPage(initialCategory: 'ShopProducts', shopId: widget.shopId)),
              );
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    if (_apiError) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, color: Colors.grey, size: 48),
            const SizedBox(height: 16),
            Text('Failed to load shop details.', style: GoogleFonts.outfit(color: Colors.grey)),
            TextButton(onPressed: _fetchShopDetails, child: const Text('Retry'))
          ],
        ),
      );
    }

    final images = _shop['shopImage'] as List? ?? [];
    final imageUrl = images.isNotEmpty && images[0] is Map ? images[0]['url'] as String? : null;
    final owner = _shop['owner'] ?? {};

    return RefreshIndicator(
      onRefresh: _fetchShopDetails,
      color: const Color(0xFF1E3A8A),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: imageUrl != null 
                      ? Image.network(imageUrl, width: 80, height: 80, fit: BoxFit.cover)
                      : Container(width: 80, height: 80, color: const Color(0xFFF1F5F9), child: const Icon(Icons.storefront, color: Colors.grey, size: 40)),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_shop['shopName'] ?? 'Unnamed Shop', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                        const SizedBox(height: 8),
                        _buildStatusBadge(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // Info Cards
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildInfoCard(Icons.location_on, 'Location', _shop['location'] ?? 'Location not available'),
                  const SizedBox(height: 12),
                  _buildOwnerCard(owner),
                  const SizedBox(height: 12),
                  _buildInfoCard(Icons.info, 'About', _shop['shopDescription'] ?? 'No description provided.'),
                ],
              ),
            ),

            // Items Section
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text('Shop Items', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
            ),
            
            if (_availableCategories.isNotEmpty)
              _buildCategorySlider(),

            _buildItemsGrid(),

            // Reviews Section
            const SizedBox(height: 24),
            _buildReviewsSection(),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    if (_shop['isHoliday'] == true) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFFDE68A))),
        child: Text('🏖️ On Holiday Today', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF92400E))),
      );
    }
    
    final isOpen = _isShopOpen();
    if (isOpen) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFF86EFAC))),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text('Open Now', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF166534))),
          ],
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFFCA5A5))),
        child: Text('🔴 Closed', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF991B1B))),
      );
    }
  }

  Widget _buildInfoCard(IconData icon, String title, String content) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF475569))),
            ],
          ),
          const SizedBox(height: 6),
          Text(content, style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF0F172A))),
        ],
      ),
    );
  }

  Widget _buildOwnerCard(Map owner) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.person, size: 16, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text('Owner', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF475569))),
            ],
          ),
          const SizedBox(height: 6),
          Text(owner['name'] ?? 'Unknown', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _launchUrl('tel:${owner['username']}'),
                  icon: const Icon(Icons.phone, size: 16),
                  label: Text('Call', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _launchUrl('https://wa.me/91${owner['username']}'),
                  icon: const Icon(Icons.chat, size: 16),
                  label: Text('Chat', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF25D366), foregroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildCategorySlider() {
    return SizedBox(
      height: 60,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          _buildCatPill('All'),
          ..._availableCategories.map((c) => _buildCatPill(c.toString())),
        ],
      ),
    );
  }

  Widget _buildCatPill(String name) {
    final isActive = _selectedCategory == name;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = name),
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF138808) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isActive ? const Color(0xFF138808) : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          name, 
          style: GoogleFonts.outfit(
            color: isActive ? Colors.white : const Color(0xFF475569), 
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500
          )
        ),
      ),
    );
  }

  Widget _buildItemsGrid() {
    final filteredItems = _selectedCategory == 'All' 
        ? _displayItems 
        : _displayItems.where((item) {
            final product = item['product'] ?? item;
            final cat = product['category'] ?? item['itemCategory'] ?? 'Others';
            return cat == _selectedCategory;
          }).toList();

    if (filteredItems.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(32),
        child: Center(child: Text('No items found.', style: GoogleFonts.outfit(color: Colors.grey))),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 16,
        childAspectRatio: 0.75,
      ),
      itemCount: filteredItems.length,
      itemBuilder: (context, index) {
        return _buildProductCard(filteredItems[index]);
      },
    );
  }

  Widget _buildProductCard(Map item) {
    final product = item['product'] ?? item;
    final name = product['name'] ?? item['name'] ?? 'Product';
    final price = item['price'] ?? 0;
    final discount = item['discount'] ?? 0;
    final qty = item['quantity'] ?? 0;
    
    String? imgUrl;
    if (product['img'] != null && product['img']['url'] != null) {
      imgUrl = product['img']['url'];
    } else if (item['img'] != null && item['img']['url'] != null) {
      imgUrl = item['img']['url'];
    }

    final discountedPrice = discount > 0 ? (price * (1 - discount / 100)).round() : price;

    return InkWell(
      onTap: () {
        if (qty > 0) {
          final iId = item['_id'] ?? item['id'] ?? '';
          Navigator.push(context, MaterialPageRoute(builder: (_) => ItemDetailPage(itemId: iId)));
        }
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    child: imgUrl != null 
                        ? Image.network(imgUrl, fit: BoxFit.cover)
                        : Container(color: const Color(0xFFF1F5F9), child: const Icon(Icons.image, color: Colors.grey)),
                  ),
                  Positioned(
                    top: 8, right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFFFF9933), Color(0xFFFF7700)]),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: const Color(0xFFFF9933).withOpacity(0.4), blurRadius: 4, offset: const Offset(0, 2))]
                      ),
                      child: Text('₹$discountedPrice', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                  ),
                  if (qty == 0)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.6), borderRadius: const BorderRadius.vertical(top: Radius.circular(16))),
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            color: Colors.grey.shade800,
                            child: Text('OUT OF STOCK', style: GoogleFonts.outfit(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 13, color: const Color(0xFF1F2937))),
                  const SizedBox(height: 6),
                  if (discount > 0)
                    Text('₹$price', style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Qty: $qty', style: GoogleFonts.outfit(fontSize: 11, color: const Color(0xFF6B7280))),
                      const Icon(Icons.arrow_forward_ios, size: 10, color: Colors.grey),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewsSection() {
    final reviews = _shop['reviews'] as List? ?? [];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Reviews & Ratings', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
          Text('What customers are saying', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF6B7280))),
          const SizedBox(height: 16),
          
          if (reviews.isEmpty)
            Text('No reviews yet.', style: GoogleFonts.outfit(color: Colors.grey))
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: reviews.length,
              separatorBuilder: (_, __) => const Divider(height: 24, color: Color(0xFFF3F4F6)),
              itemBuilder: (context, index) {
                final r = reviews[index];
                final author = r['author'] ?? {};
                final name = author['name'] ?? 'User';
                final rating = r['ratings'] ?? 5;
                final comment = r['comment'] ?? '';
                final initial = name.isNotEmpty ? name[0].toUpperCase() : 'U';

                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      backgroundColor: const Color(0xFFE0E7FF),
                      foregroundColor: const Color(0xFF3B82F6),
                      child: Text(initial, style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(name, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 14)),
                              Row(
                                children: [
                                  for (var i = 0; i < rating; i++)
                                    const Icon(Icons.star, size: 12, color: Color(0xFFF59E0B)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(comment, style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF4B5563))),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}
