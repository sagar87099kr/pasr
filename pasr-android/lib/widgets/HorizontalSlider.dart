// Mirrors: frontend/src/components/home/HorizontalSlider.jsx
// A section title + 2-row scrollable horizontal grid of item cards
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../screens/ItemDetailPage.dart';


class HorizontalSlider extends StatelessWidget {
  final String title;
  final List items;
  final String? viewAllLink;

  const HorizontalSlider({
    super.key,
    required this.title,
    required this.items,
    this.viewAllLink,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    // Split into 2 rows like the web (2-row grid)
    final row1 = [for (var i = 0; i < items.length; i += 2) items[i]];
    final row2 = [for (var i = 1; i < items.length; i += 2) items[i]];

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                const Icon(Icons.inventory_2_outlined, size: 18, color: Color(0xFF1E3A8A)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(title,
                      style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                ),
                TextButton(
                  onPressed: () {},
                  child: Text('View All', style: GoogleFonts.outfit(color: const Color(0xFF1E3A8A), fontWeight: FontWeight.w700, fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 360, // 2 rows × ~170px each + gap
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: row1.map((item) => _ItemCard(item: item)).toList()),
                  const SizedBox(height: 10),
                  Row(children: row2.map((item) => _ItemCard(item: item)).toList()),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  final dynamic item;
  const _ItemCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final title = item['title'] ?? item['name'] ?? '';
    final price = item['price'];
    final originalPrice = item['originalPrice'] ?? item['comparePrice'];
    final discount = item['discount'];
    // Safely pick the first available image list without operator-precedence bugs
    List images = [];
    if (item['productImage'] is List) images = item['productImage'] as List;
    else if (item['shopImage'] is List) images = item['shopImage'] as List;
    else if (item['itemImage'] != null) images = [item['itemImage']];
    else if (item['image'] != null) images = [item['image']];
    
    String? imageUrl;
    if (images.isNotEmpty) {
      if (images[0] is Map) {
        imageUrl = images[0]['url'] as String?;
      } else if (images[0] is String) {
        imageUrl = images[0] as String;
      }
    }
    final shopName = item['shopName'] ?? (item['owner'] is Map ? item['owner']['name'] : null);

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
        width: 148,
        margin: const EdgeInsets.only(right: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                child: imageUrl != null
                    ? Image.network(imageUrl, height: 110, width: double.infinity, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _placeholder())
                    : _placeholder(),
              ),
              Positioned(
                top: 6, left: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFF1E3A8A), borderRadius: BorderRadius.circular(6)),
                  child: Text('PRODUCT', style: GoogleFonts.outfit(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700)),
                ),
              ),
              if (discount != null && discount.toString() != '0')
                Positioned(
                  top: 6, right: 6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFF97316), borderRadius: BorderRadius.circular(6)),
                    child: Text('$discount% OFF', style: GoogleFonts.outfit(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700)),
                  ),
                ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A))),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Flexible(
                      child: Text('₹${price ?? '—'}', maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF16A34A))),
                    ),
                    if (originalPrice != null) ...[
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text('₹$originalPrice',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(fontSize: 11, color: const Color(0xFF94A3B8),
                                decoration: TextDecoration.lineThrough)),
                      ),
                    ]
                  ],
                ),
                if (shopName != null) ...[
                  const SizedBox(height: 4),
                  Text(shopName.toString(), maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF1E3A8A), fontWeight: FontWeight.w600)),
                ]
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() => Container(
    height: 110, color: const Color(0xFFF1F5F9),
    child: const Center(child: Icon(Icons.image_not_supported_outlined, color: Colors.grey)),
  );
}


