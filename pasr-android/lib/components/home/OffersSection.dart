// Mirrors: frontend/src/components/home/OffersSection.jsx
// Two promo cards: "Sign Up & Earn" (purple) and "Use Coin Discounts" (orange→red)
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OffersSection extends StatelessWidget {
  final bool isLoggedIn;
  const OffersSection({super.key, this.isLoggedIn = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
      child: SizedBox(
        height: 248,
        child: ListView(
          scrollDirection: Axis.horizontal,
          children: [
            _buildCard(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
              ),
              icon: Icons.card_giftcard_rounded,
              title: isLoggedIn ? 'Refer & Get Coins' : 'Sign Up & Earn',
              subtitle: isLoggedIn
                  ? 'Share with your friends and get 10 coins. Use coins to get discounts on products!'
                  : 'Sign up using a referral link and get welcome coins to use on your purchases.',
              buttonText: isLoggedIn ? 'Share Now' : 'Sign Up Now',
              buttonTextColor: const Color(0xFF1E3A8A),
              onTap: () {},
            ),
            const SizedBox(width: 16),
            _buildCard(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
              ),
              icon: Icons.monetization_on_rounded,
              title: 'Use Coin Discounts',
              subtitle:
                  'Apply your earned wallet coins during checkout to get amazing discounts on products and rentals. Save more!',
              buttonText: 'Save Money',
              buttonTextColor: const Color(0xFFB91C1C),
              onTap: () {},
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({
    required LinearGradient gradient,
    required IconData icon,
    required String title,
    required String subtitle,
    required String buttonText,
    required Color buttonTextColor,
    required VoidCallback onTap,
  }) {
    final width = 300.0;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
              child: Icon(icon, color: Colors.white, size: 26),
            ),
            const SizedBox(height: 14),
            Text(title, style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: GoogleFonts.outfit(color: Colors.white.withOpacity(0.9), fontSize: 12, height: 1.4)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99)),
              child: Text(buttonText, style: GoogleFonts.outfit(color: buttonTextColor, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ],
        ),
      ),
    );
  }
}
