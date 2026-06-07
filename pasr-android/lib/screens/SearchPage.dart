import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import '../utils/constants.dart';
import '../services/api_service.dart';
import 'ShopDetailPage.dart';
import 'ServiceDetailPage.dart';
import 'ItemDetailPage.dart';

class SearchPage extends StatefulWidget {
  final String? initialLocation;
  final String? initialQuery;
  final String? initialCategory;
  final String? shopId;
  const SearchPage({super.key, this.initialLocation, this.initialQuery, this.initialCategory, this.shopId});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final TextEditingController _queryController = TextEditingController();
  
  bool _isLoading = false;
  bool _apiError = false;
  
  List _items = [];
  List _shops = [];
  List _products = [];
  List _providers = [];
  
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null) {
      _queryController.text = widget.initialQuery!;
    }
    
    // Automatically search if query is provided
    if (_queryController.text.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _performSearch();
      });
    }
  }

  @override
  void dispose() {
    _queryController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged() {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _performSearch();
    });
  }

  Future<void> _performSearch() async {
    final q = _queryController.text.trim();
    if (q.length < 2) {
      setState(() {
        _items = []; _shops = []; _products = []; _providers = [];
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _apiError = false;
    });

    try {
      final res = await ApiService.get('/search?q=${Uri.encodeComponent(q)}');
      
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true) {
          List newItems = json['items'] ?? [];
          List newShops = json['shops'] ?? [];
          List newProducts = json['products'] ?? [];
          List newProviders = json['providers'] ?? [];

          // Contextual filtering based on where user came from
          if (widget.shopId != null) {
            newItems = newItems.where((item) {
              final shop = item['shop'];
              if (shop is String) return shop == widget.shopId;
              if (shop is Map && shop['_id'] != null) return shop['_id'] == widget.shopId;
              return false;
            }).toList();
            newShops = [];
            newProducts = [];
            newProviders = [];
          } else if (widget.initialCategory == 'Services') {
            newItems = [];
            newShops = [];
            newProducts = [];
            // newProviders remain
          } else if (widget.initialCategory == 'Shops') {
            newItems = [];
            // newShops remain
            newProducts = [];
            newProviders = [];
          }

          setState(() {
            _items = newItems;
            _shops = newShops;
            _products = newProducts;
            _providers = newProviders;
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
        titleSpacing: 0,
        title: _buildSearchInputs(),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildSearchInputs() {
    return Padding(
      padding: const EdgeInsets.only(right: 16.0),
      child: Container(
        height: 36,
        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(20)),
        child: TextField(
          controller: _queryController,
          onChanged: (val) => _onSearchChanged(),
          style: GoogleFonts.outfit(fontSize: 14),
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Search products, shops...',
            prefixIcon: const Icon(Icons.search, size: 16, color: Color(0xFF94A3B8)),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
          ),
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
            Text('Failed to load search results.', style: GoogleFonts.outfit(color: Colors.grey)),
            TextButton(onPressed: _performSearch, child: const Text('Retry'))
          ],
        ),
      );
    }
    
    if (_queryController.text.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('Find local shops, products and services', style: GoogleFonts.outfit(color: Colors.grey, fontSize: 16)),
          ],
        ),
      );
    }

    if (_items.isEmpty && _shops.isEmpty && _products.isEmpty && _providers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.sentiment_dissatisfied, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No results found.', style: GoogleFonts.outfit(color: Colors.grey, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_items.isNotEmpty) _buildSectionHeader('Shop Products'),
        if (_items.isNotEmpty) GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.75),
            itemCount: _items.length,
            itemBuilder: (_, i) => _ProductCard(item: _items[i]),
        ),
        
        if (_shops.isNotEmpty) _buildSectionHeader('Local Shops'),
        if (_shops.isNotEmpty) ..._shops.map((s) => _buildShopCard(s)),
        
        if (_products.isNotEmpty) _buildSectionHeader('Direct Products'),
        if (_products.isNotEmpty) GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.75),
            itemCount: _products.length,
            itemBuilder: (_, i) => _ProductCard(item: _products[i]),
        ),
        
        if (_providers.isNotEmpty) _buildSectionHeader('Service Providers'),
        if (_providers.isNotEmpty) ..._providers.map((p) => _buildProviderCard(p)),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 12),
      child: Text(title, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF1E293B))),
    );
  }

  // Removed _buildItemCard because we use _ProductCard now

  Widget _buildShopCard(Map shop) {
    final images = shop['shopImage'] as List? ?? [];
    final imgUrl = images.isNotEmpty ? images[0]['url'] : null;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: imgUrl != null 
            ? Image.network(imgUrl, width: 60, height: 60, fit: BoxFit.cover, errorBuilder: (_,__,___) => const Icon(Icons.store, size: 40))
            : Container(width: 60, height: 60, color: Colors.grey.shade200, child: const Icon(Icons.store, color: Colors.grey)),
        ),
        title: Text(shop['shopName'] ?? 'Shop', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        subtitle: Text(shop['category'] ?? 'General', style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600)),
        onTap: () {
          final id = shop['_id'] ?? shop['id'];
          if (id != null) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => ShopDetailPage(shopId: id)));
          }
        },
      ),
    );
  }

  // Removed _buildFarmProductCard because we use _ProductCard now

  Widget _buildProviderCard(Map provider) {
    final name = provider['owner'] != null ? provider['owner']['name'] : 'Provider';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: CircleAvatar(
          radius: 24,
          backgroundColor: Colors.blue.shade50,
          child: const Icon(Icons.build, color: Colors.blue),
        ),
        title: Text(provider['company'] ?? name, style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        subtitle: Text(provider['categories'] ?? 'Service', style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600)),
        onTap: () {
          final id = provider['_id'] ?? provider['id'];
          if (id != null) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => ServiceDetailPage(providerId: id)));
          }
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Product Card
// ═══════════════════════════════════════════════════════════════════════════════
class _ProductCard extends StatelessWidget {
  final Map item;
  const _ProductCard({required this.item});
  @override
  Widget build(BuildContext context) {
    final title = item['productName'] ?? item['title'] ?? item['name'] ?? '';
    final price = item['price'];
    final originalPrice = item['actualPrice'] ?? item['originalPrice'] ?? item['comparePrice'];
    final discount = item['discount'];
    final shopName = item['shopName'] ?? (item['shop'] != null ? item['shop']['shopName'] : null) ?? (item['owner'] is Map ? item['owner']['name'] : null);
    String? imageUrl;
    
    // Attempt to safely extract image
    if (item['image'] is String && (item['image'] as String).isNotEmpty) {
      imageUrl = item['image'] as String;
    } else if (item['img'] != null && item['img']['url'] != null) {
      imageUrl = item['img']['url'];
    } else {
      List images = [];
      if (item['productImage'] is List) images = item['productImage'] as List;
      else if (item['shopImage'] is List) images = item['shopImage'] as List;
      imageUrl = images.isNotEmpty && images[0] is Map ? images[0]['url'] as String? : null;
    }
    
    return InkWell(
      onTap: () {
        final itemId = item['_id'] ?? item['id'];
        if (itemId != null) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ItemDetailPage(itemId: itemId),
            ),
          );
        }
      },
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))]),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(fit: StackFit.expand, children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
                child: imageUrl != null
                    ? Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _ph())
                    : _ph(),
              ),
              if (discount != null && discount.toString() != '0' && discount.toString() != 'null')
                Positioned(top: 8, right: 8, child: Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3), decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(6)), child: Text('$discount% OFF', style: GoogleFonts.outfit(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700)))),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A))),
              const SizedBox(height: 4),
              Row(children: [
                Text('₹${originalPrice ?? price ?? '—'}', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF16A34A))),
                if (discount != null && discount > 0) ...[
                  const SizedBox(width: 6),
                  Text('₹$price', style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF94A3B8), decoration: TextDecoration.lineThrough)),
                ],
              ]),
              if (shopName != null) Text(shopName.toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF1E3A8A), fontWeight: FontWeight.w600)),
            ]),
          ),
        ],
      ),
    ));
  }
  Widget _ph() => Container(color: const Color(0xFFF1F5F9), child: const Center(child: Icon(Icons.image_not_supported_outlined, color: Color(0xFFCBD5E1), size: 32)));
}
