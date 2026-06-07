// Mirrors: frontend/src/pages/HomePage.jsx
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart';
import 'package:flutter/services.dart';
import '../components/home/OffersSection.dart';
import '../services/AuthService.dart';
import '../services/api_service.dart';
import 'LoginPage.dart';
import 'SignupPage.dart';
import 'ProfilePage.dart';
import 'ItemDetailPage.dart';
import 'ShopDetailPage.dart';
import 'ShopsPage.dart';
import 'ServicePage.dart';
import 'SearchPage.dart';
import 'CategoryPage.dart';
import '../widgets/BazaarSelectionSheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // ── Auth state ──────────────────────────────────────────────────────────────
  Map<String, dynamic>? _loggedInUser;
  bool _authChecked = false;
  bool _isAuthLoading = true;

  // ── API data ────────────────────────────────────────────────────────────────
  List _shops = [];
  List<Map<String, dynamic>> _systemCategories = [];
  bool _isLoading = true;
  bool _apiError = false;
  String _selectedBazaarName = '';

  // ── Category / nav ──────────────────────────────────────────────────────────
  String _selectedCategory = 'All Products';
  int _navIndex = 0;

  // ── Pagination & Products ───────────────────────────────────────────────────
  List _currentItems = [];
  int _currentPage = 1;
  bool _hasMore = true;
  bool _isFetchingMore = false;
  final ScrollController _scrollController = ScrollController();

  final List<GlobalKey<NavigatorState>> _navigatorKeys = [
    GlobalKey<NavigatorState>(),
    GlobalKey<NavigatorState>(),
    GlobalKey<NavigatorState>(),
    GlobalKey<NavigatorState>(),
    GlobalKey<NavigatorState>(),
  ];

  static const _categorySequence = [
    'All Products',
    'Fashion',
    'Mobile Shop',
    'Electronics',
    'Footwear',
    'Grocery',
    'General Store',
    'Bakery',
    'Restaurant',
    'Vegetables & Fruits',
    'Medical',
    'Beauty/Cosmetics',
    'Hardware',
    'Sweet Shop',
    'Jewelers',
    'Furniture',
    'Dhaba',
    'Non-Veg',
    'Printing & Digital',
    'Salon',
    'Seeds & Fertilizers',
    'Sports',
    'Stationery',
    'Others',
  ];

  @override
  void initState() {
    super.initState();
    _loadBazaarPreference();
    _checkAuth();
    _fetchAll();
    _scrollController.addListener(_onScroll);
  }

  Future<void> _loadBazaarPreference() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _selectedBazaarName = prefs.getString('selected_bazaar_name') ?? '';
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoading && !_isFetchingMore && _hasMore) {
        _fetchCategoryItems(loadMore: true);
      }
    }
  }

  Future<void> _checkAuth() async {
    debugPrint('[_checkAuth] START - setting _isAuthLoading = true');
    setState(() => _isAuthLoading = true);
    try {
      final user = await AuthService.getUser();
      debugPrint('[_checkAuth] AuthService.getUser returned: $user');
      if (mounted) {
        setState(() {
          _loggedInUser = user;
          _authChecked = true;
        });
      }
    } catch (e) {
      debugPrint('[_checkAuth] caught error: $e');
      if (mounted) {
        setState(() {
          _loggedInUser = null;
          _authChecked = true;
        });
      }
    } finally {
      debugPrint('[_checkAuth] FINALLY - setting _isAuthLoading = false');
      if (mounted) setState(() => _isAuthLoading = false);
    }
  }

  // Called after login / logout so header refreshes
  void _refreshAuth() => _checkAuth();

  Future<void> _fetchAll() async {
    debugPrint('[_fetchAll] START');
    setState(() {
      _isLoading = true;
      _apiError = false;
    });
    try {
      debugPrint('[_fetchAll] Waiting for discovery and home items...');
      await Future.wait([_fetchDiscovery(), _fetchHomeItems()])
          .timeout(const Duration(seconds: 20));
      debugPrint('[_fetchAll] Future.wait completed successfully');
    } catch (e) {
      debugPrint('[_fetchAll] caught error: $e');
      if (mounted) setState(() => _apiError = true);
    } finally {
      debugPrint('[_fetchAll] FINALLY setting _isLoading = false');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchDiscovery() async {
    debugPrint('[_fetchDiscovery] START');
    try {
      final res = await ApiService.get('/api/discovery')
          .timeout(const Duration(seconds: 10));
      debugPrint('[_fetchDiscovery] got response: ${res.statusCode}');
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true)
          setState(() {
            _shops = json['data']['shops'] ?? [];
          });
      }
    } catch (e) {
      debugPrint('[_fetchDiscovery] caught error: $e');
      setState(() => _apiError = true);
    }
  }

  List<String> _activeCategories = [];

  Future<void> _fetchHomeItems() async {
    _currentPage = 1;
    _currentItems.clear();
    _hasMore = true;
    await _fetchCategoryItems(loadMore: false);
  }

  Future<void> _fetchCategoryItems({bool loadMore = false}) async {
    debugPrint('[_fetchCategoryItems] START');
    if (loadMore) {
      setState(() => _isFetchingMore = true);
      _currentPage++;
    }

    try {
      String url = '$kBaseUrl/api/home/items?page=$_currentPage&limit=10';
      if (_selectedCategory != 'All Products') {
        url += '&shopCategory=${Uri.encodeComponent(_selectedCategory)}';
      }
      debugPrint('[_fetchCategoryItems] GET $url');
      final res = await ApiService.get(url.replaceAll('$kBaseUrl', ''))
          .timeout(const Duration(seconds: 15));
      debugPrint('[_fetchCategoryItems] got response: ${res.statusCode}');
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        final items = List.from(json['items'] ?? []).where((item) {
          String? imageUrl;
          if (item['image'] is String && (item['image'] as String).isNotEmpty) {
            imageUrl = item['image'] as String;
          } else if (item['img'] != null && item['img']['url'] != null) {
            imageUrl = item['img']['url'];
          } else {
            List images = [];
            if (item['productImage'] is List)
              images = item['productImage'] as List;
            else if (item['shopImage'] is List)
              images = item['shopImage'] as List;
            imageUrl = images.isNotEmpty && images[0] is Map
                ? images[0]['url'] as String?
                : null;
          }

          final hasValidImage = imageUrl != null &&
              imageUrl.isNotEmpty &&
              imageUrl.trim() != 'null' &&
              imageUrl.trim() != 'undefined' &&
              imageUrl.startsWith('http') &&
              !imageUrl.contains('No_Image_Available');

          bool isOutOfStock = false;
          if (item['quantity'] != null) {
            if (item['quantity'] is num) {
              isOutOfStock = (item['quantity'] as num).toInt() == 0;
            } else if (item['quantity'] is String) {
              isOutOfStock = (int.tryParse(item['quantity']) ?? -1) == 0;
            }
          }

          return hasValidImage && !isOutOfStock;
        }).toList();

        setState(() {
          if (loadMore) {
            _currentItems.addAll(items);
          } else {
            _currentItems = items;
          }
          _hasMore = json['hasMore'] ?? false;
          if (json['categories'] != null) {
            _systemCategories =
                List<Map<String, dynamic>>.from(json['categories']);
          }
          if (json['activeCategories'] != null) {
            _activeCategories = List<String>.from(json['activeCategories']);
          }
        });
      }
    } catch (e) {
      debugPrint('[_fetchCategoryItems] error: $e');
      if (loadMore) _currentPage--; // Revert page if failed
    } finally {
      if (loadMore) {
        setState(() => _isFetchingMore = false);
      }
    }
  }

  List<String> get _availableCategories {
    return _categorySequence.toList();
  }

  List get _selectedItems => _currentItems;

  // ── Build ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    debugPrint(
        '[HomePage build] _isLoading = $_isLoading, _isAuthLoading = $_isAuthLoading, _shops = ${_shops.length}, _currentItems = ${_currentItems.length}, _apiError = $_apiError');
    if (!_scrollController.hasListeners) {
      _scrollController.addListener(_onScroll);
    }
    return _HomePageStateProvider(
      state: this,
      child: PopScope(
        canPop: false,
        onPopInvoked: (didPop) async {
          if (didPop) return;
          final currentNavigator = _navigatorKeys[_navIndex].currentState;
          if (currentNavigator != null && currentNavigator.canPop()) {
            currentNavigator.pop();
          } else {
            if (_navIndex != 0) {
              setState(() => _navIndex = 0);
            } else {
              SystemNavigator.pop();
            }
          }
        },
        child: Scaffold(
          backgroundColor: const Color(0xFFF9FAFB),
          body: SafeArea(
            child: IndexedStack(
              index: _navIndex,
              children: [
                _buildNavigator(0),
                _buildNavigator(1),
                _buildNavigator(2),
                _buildNavigator(3),
                _buildNavigator(4),
              ],
            ),
          ),
          bottomNavigationBar: _buildBottomNav(),
        ),
      ),
    );
  }

  Widget _buildNavigator(int index) {
    return Navigator(
      key: _navigatorKeys[index],
      onGenerateRoute: (routeSettings) {
        return MaterialPageRoute(
          builder: (context) {
            final homeState = _HomePageStateProvider.of(context);
            switch (index) {
              case 0:
                return homeState._buildHomeFeed();
              case 1:
                return const ServicePage();
              case 2:
                return CategoryPage(
                    onNavigateTab: (idx) =>
                        homeState.setState(() => homeState._navIndex = idx));
              case 3:
                return const ShopsPage();
              case 4:
                return ProfilePage(
                  onAuthChanged: homeState._refreshAuth,
                  onLogout: () {
                    homeState.setState(() => homeState._navIndex = 0);
                    homeState._refreshAuth();
                  },
                );
              default:
                return homeState._buildHomeFeed();
            }
          },
        );
      },
    );
  }

  void _showCoinsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.monetization_on, color: Colors.amber, size: 28),
            const SizedBox(width: 8),
            Text('PASR Coins',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, fontSize: 20)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('What are PASR Coins?',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
                'PASR Coins are digital rewards you earn for being an active user.',
                style: GoogleFonts.outfit(color: Colors.grey.shade700)),
            const SizedBox(height: 16),
            Text('How to earn more?',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
                '• Refer a friend\n• Complete a purchase\n• Leave reviews on services',
                style: GoogleFonts.outfit(color: Colors.grey.shade700)),
            const SizedBox(height: 16),
            Text('Where to use them?',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
                'You can redeem PASR Coins for discounts during your checkout!',
                style: GoogleFonts.outfit(color: Colors.grey.shade700)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Got it!',
                style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold, color: Colors.blue)),
          ),
        ],
      ),
    );
  }

  // ── Modals / location ───────────────────────────────────────────────────────
  void _changeLocation() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return FractionallySizedBox(
          heightFactor: 0.85,
          child: BazaarSelectionSheet(
            onBazaarSelected: (name, lat, lng) {
              setState(() {
                _selectedBazaarName = name;
              });
              _fetchAll(); // Refresh with new location
            },
          ),
        );
      },
    );
  }

  Widget _buildHomeFeed() {
    debugPrint('[_buildHomeFeed] building, _isLoading = $_isLoading');

    if (_selectedBazaarName.isEmpty || _selectedBazaarName == 'All Bazaars') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.storefront, size: 80, color: const Color(0xFF1E3A8A)),
              const SizedBox(height: 24),
              Text(
                'Welcome to PASR',
                style: GoogleFonts.outfit(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1E3A8A),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'To discover shops, farmers, and services near you, please select your local marketplace.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: _changeLocation,
                icon: const Icon(Icons.location_on),
                label: const Text('Select Local Bazaar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF97316),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchAll,
      color: const Color(0xFF1E3A8A),
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverToBoxAdapter(child: _buildHeader()),
          SliverToBoxAdapter(child: _buildSearchBar()),
          SliverToBoxAdapter(
              child: OffersSection(isLoggedIn: _loggedInUser != null)),
          SliverToBoxAdapter(child: const SizedBox(height: 24)),
          if (_isLoading)
            const SliverToBoxAdapter(
                child: Padding(
              padding: EdgeInsets.all(40),
              child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF1E3A8A))),
            ))
          else ...[
            if (_apiError) SliverToBoxAdapter(child: _buildApiErrorBanner()),
            if (_shops.isEmpty && _currentItems.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.store_mall_directory_outlined, size: 80, color: Colors.grey.shade400),
                      const SizedBox(height: 24),
                      Text(
                        'We will reach you soon!',
                        style: GoogleFonts.outfit(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1E3A8A),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Currently, there are no products or shops available in this bazaar.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else ...[
              if (_shops.isNotEmpty) SliverToBoxAdapter(child: _buildShopsNearYou()),
              if (_shops.isNotEmpty || _currentItems.isNotEmpty) SliverToBoxAdapter(child: _buildPopularCategories()),
              if (_currentItems.isNotEmpty) SliverToBoxAdapter(child: _buildCategoryItems()),
            ]
          ],
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  // ── Header (dynamic logged-in state) ──────────────────────────────────────
  Widget _buildHeader() {
    final isLoggedIn = _loggedInUser != null;
    final coins = _loggedInUser?['coins'] ?? 0;
    String userLocation = 'Select Location';
    if (_selectedBazaarName.isNotEmpty) {
      userLocation = _selectedBazaarName;
    } else {
      userLocation = _loggedInUser?['address'] ?? _loggedInUser?['location'] ?? 'All Bazaars';
    }

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        children: [
          const Icon(Icons.location_on, color: Color(0xFF1E3A8A), size: 20),
          const SizedBox(width: 6),
          Expanded(
            child: GestureDetector(
              onTap: _changeLocation,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text('Your Location',
                          style: GoogleFonts.outfit(
                              fontSize: 11, color: const Color(0xFF94A3B8))),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down,
                          size: 14, color: Color(0xFF94A3B8)),
                    ],
                  ),
                  Text(userLocation,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.outfit(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF1E3A8A))),
                ],
              ),
            ),
          ),
          IconButton(
              icon: const Icon(Icons.search, color: Color(0xFF0F172A)),
              onPressed: () {}),
          if (isLoggedIn) ...[
            // ── Coins badge ───────────────────────────────────────────
            GestureDetector(
              onTap: () => _showCoinsDialog(context),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.monetization_on,
                        color: Colors.amber, size: 16),
                    const SizedBox(width: 4),
                    Text('$coins',
                        style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: const Color(0xFF92400E))),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
            // ── Notification bell ─────────────────────────────────────
            GestureDetector(
              onTap: () {},
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9), shape: BoxShape.circle),
                child: const Icon(Icons.notifications_none_outlined,
                    color: Color(0xFF0F172A), size: 20),
              ),
            ),
          ] else if (_isAuthLoading) ...[
            // ── Auth still loading: show a subtle spinner ─────────────
            const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Color(0xFF1E3A8A))),
          ] else ...[
            // ── Not logged in: show Login + Sign Up ───────────────────
            TextButton(
              onPressed: () async {
                await Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const LoginPage()));
                _refreshAuth();
              },
              style: TextButton.styleFrom(
                backgroundColor: const Color(0xFFEEF2FF),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                minimumSize: Size.zero,
              ),
              child: Text('Login',
                  style: GoogleFonts.outfit(
                      color: const Color(0xFF1E3A8A),
                      fontWeight: FontWeight.w700,
                      fontSize: 12)),
            ),
            const SizedBox(width: 6),
            ElevatedButton(
              onPressed: () async {
                await Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const SignupPage()));
                _refreshAuth();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF97316),
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                elevation: 0,
                minimumSize: Size.zero,
              ),
              child: Text('Sign Up',
                  style: GoogleFonts.outfit(
                      fontWeight: FontWeight.w700, fontSize: 12)),
            ),
          ],
        ],
      ),
    );
  }

  // ── Search Bar ─────────────────────────────────────────────────────────────
  Widget _buildSearchBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: TextField(
          textInputAction: TextInputAction.search,
          onSubmitted: (value) {
            if (value.trim().isNotEmpty) {
              String searchCategory = 'All';
              if (_navIndex == 1) searchCategory = 'Services';
              if (_navIndex == 3) searchCategory = 'Shops';

              Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => SearchPage(
                          initialQuery: value.trim(),
                          initialCategory: searchCategory)));
            }
          },
          decoration: InputDecoration(
            hintText: 'Search for shops, products...',
            hintStyle: GoogleFonts.outfit(
                color: const Color(0xFF94A3B8), fontSize: 14),
            prefixIcon:
                const Icon(Icons.search, color: Color(0xFF94A3B8), size: 18),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }

  // ── Shops Near You ─────────────────────────────────────────────────────────
  Widget _buildShopsNearYou() {
    return Padding(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Text('Shops Near You',
                    style: GoogleFonts.outfit(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A))),
                const Spacer(),
                TextButton(
                  onPressed: () => setState(() => _navIndex = 2),
                  child: Text('See All',
                      style: GoogleFonts.outfit(
                          color: const Color(0xFF1E3A8A),
                          fontWeight: FontWeight.w700,
                          fontSize: 13)),
                ),
              ],
            ),
          ),
          if (_shops.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Text('No shops found nearby.',
                  style: GoogleFonts.outfit(color: const Color(0xFF94A3B8))),
            )
          else
            SizedBox(
              height: 180,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _shops.length,
                itemBuilder: (_, i) => _ShopCard(shop: _shops[i]),
              ),
            ),
        ],
      ),
    );
  }

  // ── Popular Categories ─────────────────────────────────────────────────────
  Widget _buildPopularCategories() {
    final cats = _availableCategories;
    if (cats.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 24, 0, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Text('Popular Categories',
                    style: GoogleFonts.outfit(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A))),
                const Spacer(),
                TextButton(
                    onPressed: () {},
                    child: Text('See All',
                        style: GoogleFonts.outfit(
                            color: const Color(0xFF1E3A8A),
                            fontWeight: FontWeight.w700,
                            fontSize: 13))),
              ],
            ),
          ),
          SizedBox(
            height: 42,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: cats.length,
              itemBuilder: (_, i) {
                final cat = cats[i];
                final isSelected = cat == _selectedCategory;
                return GestureDetector(
                  onTap: () {
                    if (_selectedCategory != cat) {
                      setState(() => _selectedCategory = cat);
                      _currentPage = 1;
                      _currentItems.clear();
                      _hasMore = true;
                      _fetchCategoryItems(loadMore: false);
                    }
                  },
                  child: Container(
                    margin: const EdgeInsets.only(right: 10),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                      color:
                          isSelected ? const Color(0xFF1E3A8A) : Colors.white,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(
                          color: isSelected
                              ? const Color(0xFF1E3A8A)
                              : const Color(0xFFE5E7EB)),
                    ),
                    child: Text(cat,
                        style: GoogleFonts.outfit(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? Colors.white
                                : const Color(0xFF374151))),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ── Category Items Grid ────────────────────────────────────────────────────
  Widget _buildCategoryItems() {
    final items = _selectedItems;
    if (items.isEmpty && !_isFetchingMore) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Center(
            child: Text('No items in this category yet.',
                style: GoogleFonts.outfit(
                    color: const Color(0xFF94A3B8), fontSize: 14))),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        children: [
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.75),
            itemCount: items.length,
            itemBuilder: (_, i) => _ProductCard(item: items[i]),
          ),
          if (_isFetchingMore)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF1E3A8A))),
            ),
        ],
      ),
    );
  }

  // ── API Error Banner ───────────────────────────────────────────────────────
  Widget _buildApiErrorBanner() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: const Color(0xFFFFF7ED),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFFED7AA))),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, color: Color(0xFFEA580C), size: 18),
          const SizedBox(width: 8),
          Expanded(
              child: Text(
                  'Cannot reach backend. Check kBaseUrl in constants.dart.',
                  style: GoogleFonts.outfit(
                      fontSize: 11, color: const Color(0xFF9A3412)))),
          GestureDetector(
              onTap: _fetchAll,
              child: const Icon(Icons.refresh,
                  color: Color(0xFFEA580C), size: 18)),
        ],
      ),
    );
  }

  // ── Bottom Nav ─────────────────────────────────────────────────────────────
  Widget _buildBottomNav() {
    return BottomNavigationBar(
      currentIndex: _navIndex,
      onTap: (i) => setState(() => _navIndex = i),
      type: BottomNavigationBarType.fixed,
      backgroundColor: Colors.white,
      elevation: 8,
      selectedItemColor: const Color(0xFF1E3A8A),
      unselectedItemColor: const Color(0xFF94A3B8),
      selectedLabelStyle:
          GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 11),
      unselectedLabelStyle: GoogleFonts.outfit(fontSize: 11),
      items: const [
        BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home'),
        BottomNavigationBarItem(
            icon: Icon(Icons.build_outlined),
            activeIcon: Icon(Icons.build),
            label: 'Services'),
        BottomNavigationBarItem(
            icon: Icon(Icons.grid_view_outlined),
            activeIcon: Icon(Icons.grid_view),
            label: 'Category'),
        BottomNavigationBarItem(
            icon: Icon(Icons.storefront_outlined),
            activeIcon: Icon(Icons.storefront),
            label: 'Shops'),
        BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile'),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shop Card
// ═══════════════════════════════════════════════════════════════════════════════
class _ShopCard extends StatelessWidget {
  final Map shop;
  const _ShopCard({required this.shop});
  @override
  Widget build(BuildContext context) {
    final name = shop['shopName'] ?? shop['name'] ?? 'Shop';
    final address = shop['location'] ?? shop['address'] ?? '';
    final category = shop['category'] ?? 'General Store';
    final images = shop['shopImage'] as List? ?? [];
    final imageUrl = images.isNotEmpty && images[0] is Map
        ? images[0]['url'] as String?
        : null;
    return InkWell(
      onTap: () {
        final shopId = shop['_id'] ?? shop['id'];
        if (shopId != null) {
          Navigator.push(
              context,
              MaterialPageRoute(
                  builder: (_) => ShopDetailPage(shopId: shopId)));
        }
      },
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 6,
                  offset: const Offset(0, 2))
            ]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(14)),
                  child: imageUrl != null
                      ? Image.network(imageUrl,
                          height: 90,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _ph())
                      : _ph(),
                ),
                Positioned(
                  top: 6,
                  left: 6,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                        color: const Color(0xFF1E3A8A),
                        borderRadius: BorderRadius.circular(6)),
                    child: Text('SHOP',
                        style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.outfit(
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                            color: const Color(0xFF0F172A))),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.sell,
                            size: 10, color: Color(0xFF1E3A8A)),
                        const SizedBox(width: 4),
                        Expanded(
                            child: Text(category,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.outfit(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF1E3A8A)))),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.location_on,
                            size: 10, color: Color(0xFF64748B)),
                        const SizedBox(width: 4),
                        Expanded(
                            child: Text(
                                address.isNotEmpty
                                    ? address
                                    : 'Location not available',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.outfit(
                                    fontSize: 10,
                                    color: const Color(0xFF64748B)))),
                      ],
                    ),
                  ]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ph() => Container(
      height: 90,
      color: const Color(0xFFF1F5F9),
      child: const Center(
          child: Icon(Icons.storefront_outlined,
              color: Color(0xFFCBD5E1), size: 32)));
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
    final originalPrice =
        item['actualPrice'] ?? item['originalPrice'] ?? item['comparePrice'];
    final discount = item['discount'];
    final shopName = item['shopName'] ??
        (item['owner'] is Map ? item['owner']['name'] : null);
    String? imageUrl;
    if (item['image'] is String &&
        (item['image'] as String).isNotEmpty &&
        (item['image'] as String).trim() != 'null') {
      imageUrl = item['image'] as String;
    } else if (item['img'] != null && item['img']['url'] != null) {
      imageUrl = item['img']['url'] as String;
    } else {
      List images = [];
      if (item['productImage'] is List)
        images = item['productImage'] as List;
      else if (item['shopImage'] is List) images = item['shopImage'] as List;
      imageUrl = images.isNotEmpty && images[0] is Map
          ? images[0]['url'] as String?
          : null;
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
          decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 6,
                    offset: const Offset(0, 2))
              ]),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(fit: StackFit.expand, children: [
                  ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(14)),
                    child: imageUrl != null
                        ? Image.network(imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _ph())
                        : _ph(),
                  ),
                  if (discount != null &&
                      discount.toString() != '0' &&
                      discount.toString() != 'null')
                    Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                                color: const Color(0xFFF97316),
                                borderRadius: BorderRadius.circular(6)),
                            child: Text('$discount% OFF',
                                style: GoogleFonts.outfit(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700)))),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0F172A))),
                      const SizedBox(height: 4),
                      Row(children: [
                        Text('₹${originalPrice ?? price ?? '—'}',
                            style: GoogleFonts.outfit(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF16A34A))),
                        if (discount != null && discount > 0) ...[
                          const SizedBox(width: 6),
                          Text('₹$price',
                              style: GoogleFonts.outfit(
                                  fontSize: 10,
                                  color: const Color(0xFF94A3B8),
                                  decoration: TextDecoration.lineThrough)),
                        ],
                      ]),
                      if (shopName != null)
                        Text(shopName.toString(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.outfit(
                                fontSize: 10,
                                color: const Color(0xFF1E3A8A),
                                fontWeight: FontWeight.w600)),
                    ]),
              ),
            ],
          ),
        ));
  }

  Widget _ph() => Container(
      color: const Color(0xFFF1F5F9),
      child: const Center(
          child: Icon(Icons.image_not_supported_outlined,
              color: Color(0xFFCBD5E1), size: 32)));
}

class _HomePageStateProvider extends InheritedWidget {
  final _HomePageState state;
  const _HomePageStateProvider({required this.state, required super.child});
  @override
  bool updateShouldNotify(_HomePageStateProvider oldWidget) => true;

  static _HomePageState of(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<_HomePageStateProvider>()!
        .state;
  }
}
