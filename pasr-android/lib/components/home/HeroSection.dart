// Mirrors: frontend/src/components/home/HeroSection.jsx
// Deep blue section with: Local Bazaar, Shop Nearby, Kisan Sabha action buttons
// + Browse by Category row
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  static const _primary = Color(0xFF1E3A8A);
  static const _orange = Color(0xFFF97316);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: _primary,
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
      child: Column(
        children: [
          Text('PASR: Local Marketplace for You',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('Buy Daily Essentials & Book Services Instantly',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.85), fontSize: 14)),
          const SizedBox(height: 24),
          _actionTile(
            color: _orange,
            imageUrl: 'https://www.pasr.in/images/localMarket.jpg',
            title: 'Local Bazaar',
            subtitle: 'Buy fresh farm products',
            textColor: Colors.white,
            onTap: () {},
          ),
          const SizedBox(height: 12),
          _actionTile(
            color: Colors.white,
            imageUrl: 'https://www.pasr.in/images/localshops.jpg',
            title: 'Shop Nearby',
            subtitle: 'Order from local Kirana',
            textColor: _primary,
            onTap: () {},
          ),
          const SizedBox(height: 12),
          _actionTile(
            color: const Color(0xFF16A34A),
            imageUrl: 'https://www.pasr.in/images/keshanSabha.png',
            title: 'Kisan Sabha',
            subtitle: 'Connect with local farmers',
            textColor: Colors.white,
            onTap: () {},
          ),
          const SizedBox(height: 28),
          // Browse by Category
          Text('Browse by Category',
              style: GoogleFonts.outfit(
                  color: Colors.white.withOpacity(0.7), fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1)),
          const SizedBox(height: 12),
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: ['DJ/Events', 'Medical', 'Grocery', 'Repair', 'Agriculture', 'Catering', 'Vehicles', 'Decoration']
                  .map((cat) => _categoryChip(cat))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actionTile({
    required Color color,
    required String imageUrl,
    required String title,
    required String subtitle,
    required Color textColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(imageUrl, width: 56, height: 56, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(width: 56, height: 56, color: Colors.white24)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.outfit(color: textColor, fontSize: 16, fontWeight: FontWeight.w800)),
                  Text(subtitle, style: GoogleFonts.outfit(color: textColor.withOpacity(0.75), fontSize: 11)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: textColor.withOpacity(0.6)),
          ],
        ),
      ),
    );
  }

  Widget _categoryChip(String label) {
    return Container(
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      child: Text(label, style: GoogleFonts.outfit(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
    );
  }
}
