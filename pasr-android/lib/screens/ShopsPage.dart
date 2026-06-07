import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart';
import 'ShopDetailPage.dart';

class ShopsPage extends StatefulWidget {
  const ShopsPage({super.key});

  @override
  State<ShopsPage> createState() => _ShopsPageState();
}

class _ShopsPageState extends State<ShopsPage> {
  List _shops = [];
  bool _isLoading = true;
  bool _apiError = false;

  String _selectedCategory = 'All Shops';

  static const _categoryList = [
    'All Shops', 'Automobile', 'Bakery', 'Beauty/Cosmetics', 'Coaching', 'Dhaba',
    'Electronics', 'Fashion', 'Footwear', 'Furniture', 'General Store', 'Grocery',
    'Hardware', 'Jewelers', 'Medical', 'Mobile Shop', 'Non-Veg', 'Printing & Digital',
    'Restaurant', 'Salon', 'Seeds & Fertilizers', 'Sports', 'Stationery', 'Vegetables & Fruits',
    'Wholesale', 'Sweet Shop', 'Others'
  ];

  static const _catIcons = {
    "Grocery": "🛒", "Electronics": "🔌", "Fashion": "👕", "Medical": "💊",
    "Hardware": "🛠️", "Restaurant": "🍽️", "Dhaba": "🥘", "Bakery": "🍰",
    "Mobile Shop": "📱", "Stationery": "📚", "Salon": "💇", "Jewelers": "💍",
    "Non-Veg": "🍖", "Vegetables & Fruits": "🥕", "Beauty/Cosmetics": "💄",
    "Coaching": "👨‍🏫", "General Store": "🏪", "Furniture": "🪑",
    "Seeds & Fertilizers": "🌱", "Automobile": "🚗", "Printing & Digital": "🖨️",
    "Footwear": "👟", "Sports": "🏏", "Wholesale": "🏪", "Sweet Shop": "🍬",
    "Others": "📦"
  };

  @override
  void initState() {
    super.initState();
    _fetchShops();
  }

  Future<void> _fetchShops() async {
    setState(() {
      _isLoading = true;
      _apiError = false;
    });
    try {
      // Pass category to URL if not 'All Shops'
      String url = '$kBaseUrl/shops';
      if (_selectedCategory != 'All Shops') {
        url += '?category=${Uri.encodeComponent(_selectedCategory)}';
      }
      final res = await http.get(
        Uri.parse(url),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 15));
      
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true) {
          setState(() {
            _shops = json['shops'] ?? [];
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        title: Text('All Shops', style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontWeight: FontWeight.w800)),
        centerTitle: false,
      ),
      body: Column(
        children: [
          _buildCategoryFilter(),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildCategoryFilter() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: SizedBox(
        height: 36,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _categoryList.length,
          itemBuilder: (context, index) {
            final cat = _categoryList[index];
            final isSelected = _selectedCategory == cat;
            final icon = _catIcons[cat] ?? '🏪';
            final displayText = cat == 'All Shops' ? '🏪 All Shops' : '$icon $cat';
            
            return GestureDetector(
              onTap: () {
                setState(() => _selectedCategory = cat);
                _fetchShops();
              },
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFFE2E8F0)),
                ),
                child: Center(
                  child: Text(
                    displayText,
                    style: GoogleFonts.outfit(
                      color: isSelected ? Colors.white : const Color(0xFF475569),
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
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
            Text('Failed to load shops.', style: GoogleFonts.outfit(color: Colors.grey)),
            TextButton(onPressed: _fetchShops, child: const Text('Retry'))
          ],
        ),
      );
    }
    if (_shops.isEmpty) {
      return Center(child: Text('No shops found.', style: GoogleFonts.outfit(color: Colors.grey)));
    }

    return RefreshIndicator(
      onRefresh: _fetchShops,
      color: const Color(0xFF1E3A8A),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _shops.length,
        itemBuilder: (context, index) {
          return _buildShopListCard(_shops[index]);
        },
      ),
    );
  }

  Widget _buildShopListCard(Map shop) {
    final name = shop['shopName'] ?? shop['name'] ?? 'Shop';
    final addressRaw = shop['location'] ?? shop['address'] ?? '';
    final address = addressRaw.split(' ').take(3).join(' ');
    final category = shop['category'] ?? 'General Store';
    final images = shop['shopImage'] as List? ?? [];
    final imageUrl = images.isNotEmpty && images[0] is Map ? images[0]['url'] as String? : null;
    final catIcon = _catIcons[category] ?? '🏪';

    // Status logic
    final isActive = shop['isActive'] ?? true;
    final isHoliday = shop['isHoliday'] ?? false;
    final openingTime = shop['openingTime'] ?? '00:00';
    final closingTime = shop['closingTime'] ?? '23:59';
    
    final now = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30)); // IST
    final nowStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    
    bool isClosed = false;
    if (!isActive || isHoliday) {
      isClosed = true;
    } else {
      isClosed = !(nowStr.compareTo(openingTime) >= 0 && nowStr.compareTo(closingTime) <= 0);
    }

    Widget statusBadge;
    if (isHoliday) {
      statusBadge = Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(20)),
        child: Text('🏖️ Holiday', style: GoogleFonts.outfit(color: const Color(0xFF92400E), fontSize: 10, fontWeight: FontWeight.w800)),
      );
    } else if (!isClosed) {
      statusBadge = Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(20)),
        child: Text('OPEN NOW', style: GoogleFonts.outfit(color: const Color(0xFF166534), fontSize: 10, fontWeight: FontWeight.w800)),
      );
    } else {
      final h = int.tryParse(openingTime.split(':')[0]) ?? 0;
      final m = openingTime.split(':')[1];
      final ampm = h >= 12 ? 'PM' : 'AM';
      final h12 = h % 12 == 0 ? 12 : h % 12;
      statusBadge = Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(20)),
        child: Text('Open at $h12:$m $ampm', style: GoogleFonts.outfit(color: const Color(0xFF991B1B), fontSize: 10, fontWeight: FontWeight.w800)),
      );
    }

    final reviews = shop['reviews'] as List? ?? [];
    double avgRating = 0;
    if (reviews.isNotEmpty) {
      double sum = 0;
      for (var r in reviews) {
        if (r is Map && r['ratings'] != null) {
          sum += (r['ratings'] is num) ? (r['ratings'] as num).toDouble() : 0;
        }
      }
      avgRating = sum / reviews.length;
    }

    return InkWell(
      onTap: () {
        final shopId = shop['_id'] ?? shop['id'];
        if (shopId != null) {
          Navigator.push(context, MaterialPageRoute(builder: (_) => ShopDetailPage(shopId: shopId)));
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF0F0F0)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Image side
              Container(
                width: 120,
                decoration: const BoxDecoration(
                  color: Color(0xFFF8F9FA),
                  borderRadius: BorderRadius.horizontal(left: Radius.circular(16)),
                ),
                child: ClipRRect(
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(16)),
                  child: imageUrl != null
                      ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _ph())
                      : _ph(),
                ),
              ),
              // Content side
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF1A1A1A)),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              address.isNotEmpty ? address : 'Location not available',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF64748B)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(20)),
                            child: Text(
                              '$catIcon $category',
                              style: GoogleFonts.outfit(color: const Color(0xFF475569), fontSize: 10, fontWeight: FontWeight.w700),
                            ),
                          ),
                          statusBadge,
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (reviews.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 12),
                            const SizedBox(width: 4),
                            Text('${avgRating.toStringAsFixed(1)} (${reviews.length})', style: GoogleFonts.outfit(fontSize: 11, color: const Color(0xFF64748B))),
                          ],
                        )
                      else
                        Row(
                          children: [
                            const Icon(Icons.star, color: Colors.grey, size: 12),
                            const SizedBox(width: 4),
                            Text('No Rating', style: GoogleFonts.outfit(fontSize: 11, color: const Color(0xFF64748B))),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _ph() => const Center(child: Icon(Icons.storefront_outlined, color: Color(0xFFCBD5E1), size: 32));
}
