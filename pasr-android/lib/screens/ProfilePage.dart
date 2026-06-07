// Profile screen — mirrors /user page on the web
// Shows: Refer & Earn, Profile Details, My Orders, My Cart, Danger Zone, Logout
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/AuthService.dart';
import 'LoginPage.dart';
import 'SignupPage.dart';
import 'CartPage.dart';
import 'MyOrdersPage.dart';
import 'CreateProductPage.dart';
import 'BecomeProviderPage.dart';
import 'ListShopPage.dart';

class ProfilePage extends StatefulWidget {
  final VoidCallback? onAuthChanged;
  final VoidCallback? onLogout;
  const ProfilePage({super.key, this.onAuthChanged, this.onLogout});
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, dynamic>? _user;
  bool _loading = true;

  static const _primary = Color(0xFF1E3A8A);
  static const _orange = Color(0xFFF97316);

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final user = await AuthService.getUser();
      if (mounted) setState(() { _user = user; });
    } catch (e) {
      debugPrint('[_loadUser] error: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Log Out', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        content: Text('Are you sure you want to log out?', style: GoogleFonts.outfit()),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context, rootNavigator: true).pop(false),
            child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context, rootNavigator: true).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white, elevation: 0),
            child: Text('Log Out', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await AuthService.logout();
      widget.onAuthChanged?.call(); // refresh HomePage header
      if (widget.onLogout != null) {
        widget.onLogout!();
      }
      if (mounted) {
        setState(() => _user = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));

    // Not logged in
    if (_user == null) {
      return _LoggedOutView();
    }

    final name = _user!['name'] ?? 'User';
    final phone = _user!['username']?.toString() ?? '';
    final address = _user!['address'] ?? '';
    final coins = _user!['coins'] ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Profile Header ──────────────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 52, 20, 28),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [_primary, Color(0xFF1D4ED8)],
                ),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U',
                        style: GoogleFonts.outfit(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                  ),
                  const SizedBox(height: 12),
                  Text(name, style: GoogleFonts.outfit(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                        child: Text('Verified Customer', style: GoogleFonts.outfit(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Coins pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(color: Colors.amber.withOpacity(0.2), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.amber.withOpacity(0.4))),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.monetization_on, color: Colors.amber, size: 18),
                        const SizedBox(width: 6),
                        Text('$coins PaSr Coins', style: GoogleFonts.outfit(color: Colors.amber, fontWeight: FontWeight.w800, fontSize: 14)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ── Refer & Earn ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.card_giftcard, color: Color(0xFF6366F1), size: 20),
                      const SizedBox(width: 8),
                      Text('Refer & Earn', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: _primary)),
                    ]),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: const Color(0xFFF0F4FF), borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          Expanded(child: Text('PASRHFP6', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 3, color: _primary))),
                          GestureDetector(
                            onTap: () {
                              Clipboard.setData(const ClipboardData(text: 'PASRHFP6'));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Referral code copied!', style: GoogleFonts.outfit()), backgroundColor: _primary, behavior: SnackBarBehavior.floating),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(color: _primary, borderRadius: BorderRadius.circular(8)),
                              child: Text('Copy', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text('Share with friends and earn 10 coins per referral!',
                        style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600)),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Profile Details ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _Card(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.person_outline, color: Color(0xFF1E3A8A), size: 20),
                      const SizedBox(width: 8),
                      Text('Profile Details', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: _primary)),
                    ]),
                    const SizedBox(height: 14),
                    _detailRow(Icons.badge_outlined, 'Name', name),
                    _detailRow(Icons.phone_android_outlined, 'WhatsApp', phone),
                    _detailRow(Icons.location_on_outlined, 'Address', address),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Quick Actions ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _Card(
                child: Column(
                  children: [
                    _actionTile(Icons.shopping_bag_outlined, 'My Orders', 'View all your orders', _primary, () {
                      Navigator.push(context, MaterialPageRoute(builder: (context) => const MyOrdersPage()));
                    }),
                    const Divider(height: 1),
                    _actionTile(Icons.shopping_cart_outlined, 'My Cart', 'Items in your cart', _primary, () {
                      Navigator.push(context, MaterialPageRoute(builder: (context) => const CartPage()));
                    }),
                    const Divider(height: 1),
                    _actionTile(Icons.notifications_outlined, 'Notifications', 'Manage notifications', _primary, () {}),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Partner With Us ─────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _Card(
                child: Column(
                  children: [
                    Row(children: [
                      const Icon(Icons.handshake_outlined, color: Color(0xFF16A34A), size: 20),
                      const SizedBox(width: 8),
                      Text('Partner With Us', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF16A34A))),
                    ]),
                    const SizedBox(height: 8),
                    _actionTile(Icons.store_outlined, 'List Your Shop', 'Open your digital store', Colors.blue, () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ListShopPage()));
                    }),
                    const Divider(height: 1),
                    _actionTile(Icons.sell_outlined, 'Sell Your Products', 'Not for shop owners', Colors.orange, () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateProductPage()));
                    }),
                    const Divider(height: 1),
                    _actionTile(Icons.design_services_outlined, 'Become a Provider', 'Offer your services', Colors.purple, () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const BecomeProviderPage()));
                    }),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // ── Logout ──────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _Card(
                child: _actionTile(Icons.logout, 'Log Out', 'Sign out of your account', Colors.red, _logout),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey),
          const SizedBox(width: 10),
          Expanded(child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
              Text(value.isEmpty ? '—' : value, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A))),
            ],
          )),
        ],
      ),
    );
  }

  Widget _actionTile(IconData icon, String title, String subtitle, Color color, VoidCallback onTap) {
    return Material(
      type: MaterialType.transparency,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(title, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 14, color: color == Colors.red ? Colors.red : const Color(0xFF0F172A))),
        subtitle: Text(subtitle, style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey)),
        trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
        onTap: onTap,
      ),
    );
  }
}

// ── Reusable card ──────────────────────────────────────────────────────────────
class _Card extends StatelessWidget {
  final Widget child;
  const _Card({required this.child});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2))],
    ),
    child: child,
  );
}

// ── Shown when not logged in ───────────────────────────────────────────────────
class _LoggedOutView extends StatelessWidget {
  const _LoggedOutView();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(color: const Color(0xFFEEF2FF), shape: BoxShape.circle),
                child: const Icon(Icons.person_outline, color: Color(0xFF6366F1), size: 40),
              ),
              const SizedBox(height: 20),
              Text('You\'re not logged in', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
              const SizedBox(height: 8),
              Text('Login to access your profile, orders, and coins.',
                  textAlign: TextAlign.center, style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey)),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginPage())),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)), elevation: 0),
                  child: Text('Log In', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupPage())),
                  style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFFF97316), width: 2), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  child: Text('Create Account', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFFF97316))),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
