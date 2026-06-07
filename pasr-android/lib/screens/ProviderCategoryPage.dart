import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart';
import 'ServiceDetailPage.dart';

class ProviderCategoryPage extends StatefulWidget {
  final String categoryTitle;
  final String apiKey;

  const ProviderCategoryPage({super.key, required this.categoryTitle, required this.apiKey});

  @override
  State<ProviderCategoryPage> createState() => _ProviderCategoryPageState();
}

class _ProviderCategoryPageState extends State<ProviderCategoryPage> {
  List _providers = [];
  bool _isLoading = true;
  bool _apiError = false;

  @override
  void initState() {
    super.initState();
    _fetchProviders();
  }

  Future<void> _fetchProviders() async {
    setState(() {
      _isLoading = true;
      _apiError = false;
    });
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/discovery')).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true) {
          setState(() {
            _providers = json['data'][widget.apiKey] ?? [];
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
        title: Text(widget.categoryTitle, style: GoogleFonts.outfit(color: const Color(0xFF0F172A), fontWeight: FontWeight.w800)),
        centerTitle: false,
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
            Text('Failed to load services.', style: GoogleFonts.outfit(color: Colors.grey)),
            TextButton(onPressed: _fetchProviders, child: const Text('Retry'))
          ],
        ),
      );
    }
    if (_providers.isEmpty) {
      return Center(
        child: Text('No providers found in this category.', style: GoogleFonts.outfit(color: Colors.grey)),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchProviders,
      color: const Color(0xFF1E3A8A),
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 0.75,
        ),
        itemCount: _providers.length,
        itemBuilder: (context, index) {
          return _buildProviderCard(_providers[index]);
        },
      ),
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
                  ? Image.network(imageUrl, height: 100, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _ph())
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

  Widget _ph() => Container(height: 100, width: double.infinity, color: const Color(0xFFF1F5F9), child: const Center(child: Icon(Icons.person, color: Color(0xFFCBD5E1), size: 32)));
}
