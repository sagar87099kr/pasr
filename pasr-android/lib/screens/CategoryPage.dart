import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import 'ProviderCategoryPage.dart';
import 'ShopsPage.dart';

class CategoryPage extends StatelessWidget {
  final Function(int)? onNavigateTab;

  const CategoryPage({super.key, this.onNavigateTab});

  @override
  Widget build(BuildContext context) {
    final categories = [
      {'title': 'Kisan Sabha', 'icon': Icons.agriculture, 'color': Colors.green, 'type': 'url', 'val': 'https://www.pasr.in/kisan-sabha'},
      {'title': 'Local Bazaar', 'icon': Icons.shopping_basket, 'color': Colors.orange, 'type': 'tab', 'val': 0},
      {'title': 'Local Shops', 'icon': Icons.store, 'color': Colors.blue, 'type': 'tab', 'val': 3},
      {'title': 'Farming Vehicles', 'icon': Icons.agriculture_outlined, 'color': Colors.teal, 'type': 'provider', 'val': 'farming'},
      {'title': 'Four Wheelers', 'icon': Icons.directions_car, 'color': Colors.red, 'type': 'provider', 'val': 'vehicles'},
      {'title': 'HMV (Bus)', 'icon': Icons.directions_bus, 'color': Colors.indigo, 'type': 'provider', 'val': 'vehicles'}, // Uses vehicles for now
      {'title': 'Three Wheelers', 'icon': Icons.electric_rickshaw, 'color': Colors.purple, 'type': 'provider', 'val': 'threeWheelers'},
      {'title': 'Catering Services', 'icon': Icons.restaurant_menu, 'color': Colors.deepOrange, 'type': 'provider', 'val': 'catering'},
      {'title': 'Filming & Photo', 'icon': Icons.camera_alt, 'color': Colors.cyan, 'type': 'provider', 'val': 'filming'},
      {'title': 'Event Decor', 'icon': Icons.celebration, 'color': Colors.pink, 'type': 'provider', 'val': 'decoration'},
      {'title': 'DJ & Tent House', 'icon': Icons.speaker, 'color': Colors.deepPurple, 'type': 'provider', 'val': 'dj'},
      {'title': 'Band Party', 'icon': Icons.music_note, 'color': Colors.amber, 'type': 'provider', 'val': 'bandParty'},
      {'title': 'Home Services', 'icon': Icons.home_repair_service, 'color': Colors.brown, 'type': 'provider', 'val': 'homeService'},
      {'title': 'Heavy Equipment', 'icon': Icons.fire_truck, 'color': Colors.grey, 'type': 'provider', 'val': 'heavyEquipments'},
      {'title': 'Other Services', 'icon': Icons.more_horiz, 'color': Colors.blueGrey, 'type': 'provider', 'val': 'others'},
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Text('Explore Categories', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 0.85,
        ),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          return GestureDetector(
            onTap: () async {
              final type = cat['type'] as String;
              final val = cat['val'];

              if (type == 'url') {
                final url = Uri.parse(val as String);
                if (await canLaunchUrl(url)) {
                  await launchUrl(url, mode: LaunchMode.externalApplication);
                }
              } else if (type == 'tab') {
                if (onNavigateTab != null) {
                  onNavigateTab!(val as int);
                }
              } else if (type == 'provider') {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ProviderCategoryPage(
                      categoryTitle: cat['title'] as String,
                      apiKey: val as String,
                    ),
                  ),
                );
              }
            },
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: (cat['color'] as Color).withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(cat['icon'] as IconData, color: cat['color'] as Color, size: 28),
                  ),
                  const SizedBox(height: 12),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      cat['title'] as String,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF334155)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
