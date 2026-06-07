import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../utils/constants.dart';
import 'ServiceDetailPage.dart'; // We'll create this next

class ServicePage extends StatefulWidget {
  const ServicePage({super.key});

  @override
  State<ServicePage> createState() => _ServicePageState();
}

class _ServicePageState extends State<ServicePage> {
  Map<String, dynamic> _discoveryData = {};
  bool _isLoading = true;
  bool _apiError = false;

  @override
  void initState() {
    super.initState();
    _fetchDiscovery();
  }

  Future<void> _fetchDiscovery() async {
    setState(() {
      _isLoading = true;
      _apiError = false;
    });
    try {
      final res = await ApiService.get('/api/discovery').timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true) {
          setState(() {
            _discoveryData = json['data'] ?? {};
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
        title: Text('Local Services', style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontWeight: FontWeight.w800)),
        centerTitle: false,
      ),
      body: _buildBody(),
    );
  }

  bool _hasAnyProviders() {
    final keys = ['farming', 'vehicles', 'threeWheelers', 'catering', 'filming', 'decoration', 'bandParty', 'dj', 'homeService', 'heavyEquipments'];
    for (final key in keys) {
      if (_discoveryData[key] != null && _discoveryData[key] is List && (_discoveryData[key] as List).isNotEmpty) {
        return true;
      }
    }
    return false;
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
            Text('Failed to load services.', style: GoogleFonts.outfit(color: Colors.grey)),
            TextButton(onPressed: _fetchDiscovery, child: const Text('Retry'))
          ],
        ),
      );
    }

    if (!_hasAnyProviders()) {
      return RefreshIndicator(
        onRefresh: _fetchDiscovery,
        color: const Color(0xFF1E3A8A),
        child: ListView(
          padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 32),
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.handyman_outlined, size: 80, color: Colors.grey.shade400),
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
                  'Currently, there are no service providers available in this bazaar.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchDiscovery,
      color: const Color(0xFF1E3A8A),
      child: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 10),
            child: Text(
              'Verified professionals nearby',
              style: GoogleFonts.outfit(color: const Color(0xFF64748B), fontSize: 14),
            ),
          ),
          _buildHorizontalSlider('Farming & Agriculture', Icons.agriculture, _discoveryData['farming']),
          _buildHorizontalSlider('Four Wheelers & Transport', Icons.local_shipping, _discoveryData['vehicles']),
          _buildHorizontalSlider('Three Wheelers', Icons.electric_rickshaw, _discoveryData['threeWheelers']),
          _buildHorizontalSlider('Catering Services', Icons.restaurant_menu, _discoveryData['catering']),
          _buildHorizontalSlider('Filming and Photography', Icons.camera_alt, _discoveryData['filming']),
          _buildHorizontalSlider('Event Decorators', Icons.auto_awesome, _discoveryData['decoration']),
          _buildHorizontalSlider('Band Party', Icons.music_note, _discoveryData['bandParty']),
          _buildHorizontalSlider('DJ and Tent', Icons.speaker, _discoveryData['dj']),
          _buildHorizontalSlider('Home Service', Icons.home_repair_service, _discoveryData['homeService']),
          _buildHorizontalSlider('Heavy Equipments', Icons.precision_manufacturing, _discoveryData['heavyEquipments']),
        ],
      ),
    );
  }

  Widget _buildHorizontalSlider(String title, IconData icon, dynamic dataRaw) {
    List data = dataRaw is List ? dataRaw : [];
    if (data.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(
            children: [
              Icon(icon, size: 18, color: const Color(0xFF1E3A8A)),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
              ),
            ],
          ),
        ),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: data.length,
            itemBuilder: (context, index) {
              return _buildProviderCard(data[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildProviderCard(Map provider) {
    final company = provider['company'] ?? 'Service Provider';
    final locationRaw = provider['location'] ?? '';
    final location = locationRaw.split(',').take(2).join(',');
    final categoriesRaw = provider['categories'] ?? 'General';
    final categories = categoriesRaw.split(',').first;
    
    final images = provider['personImage'] as List? ?? [];
    final imageUrl = images.isNotEmpty && images[0] is Map ? (images[0]['path'] ?? images[0]['url']) as String? : null;

    final reviews = provider['review'] as List? ?? [];
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
        final providerId = provider['_id'] ?? provider['id'];
        if (providerId != null) {
          Navigator.push(context, MaterialPageRoute(builder: (_) => ServiceDetailPage(providerId: providerId)));
        }
      },
      child: Container(
        width: 150,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
              child: imageUrl != null
                  ? Image.network(imageUrl, height: 80, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _ph())
                  : _ph(),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    company,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 13, color: const Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    categories,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF1E3A8A)),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on, size: 10, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          location.isNotEmpty ? location : 'No location',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF64748B)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (reviews.isNotEmpty)
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 10),
                        const SizedBox(width: 2),
                        Text('${avgRating.toStringAsFixed(1)}', style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF64748B), fontWeight: FontWeight.w600)),
                      ],
                    )
                  else
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.grey, size: 10),
                        const SizedBox(width: 2),
                        Text('No Rating', style: GoogleFonts.outfit(fontSize: 10, color: const Color(0xFF64748B))),
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

  Widget _ph() => Container(height: 80, width: double.infinity, color: const Color(0xFFF1F5F9), child: const Center(child: Icon(Icons.person, color: Color(0xFFCBD5E1), size: 32)));
}
