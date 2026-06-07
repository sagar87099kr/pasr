import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart';
import '../services/api_service.dart';
import '../services/AuthService.dart';
import 'package:url_launcher/url_launcher.dart';

class ServiceDetailPage extends StatefulWidget {
  final String providerId;

  const ServiceDetailPage({super.key, required this.providerId});

  @override
  State<ServiceDetailPage> createState() => _ServiceDetailPageState();
}

class _ServiceDetailPageState extends State<ServiceDetailPage> {
  Map<String, dynamic>? _provider;
  List _existingDays = [];
  bool _isLoading = true;
  bool _apiError = false;

  bool _isSubmittingReview = false;
  int _rating = 5;
  final TextEditingController _commentController = TextEditingController();

  Map<String, dynamic>? _currentUser;
  DateTime _currentMonth = DateTime(DateTime.now().year, DateTime.now().month);

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _loadUser();
    _fetchProviderDetails();
  }

  Future<void> _loadUser() async {
    final user = await AuthService.getUser();
    if (mounted) setState(() => _currentUser = user);
  }

  Future<void> _fetchProviderDetails() async {
    setState(() {
      _isLoading = true;
      _apiError = false;
    });

    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/provider/${widget.providerId}/profile'),
        headers: {'Accept': 'application/json'},
      ).timeout(const Duration(seconds: 15));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true) {
          setState(() {
            _provider = json['providerData'];
            _existingDays = json['existingDays'] ?? [];
            _isLoading = false;
          });
        } else {
          setState(() { _isLoading = false; _apiError = true; });
        }
      } else {
        setState(() { _isLoading = false; _apiError = true; });
      }
    } catch (e) {
      debugPrint('Error fetching provider profile: $e');
      setState(() { _isLoading = false; _apiError = true; });
    }
  }

  Future<void> _submitReview() async {
    final user = await AuthService.getUser();
    if (user == null) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please log in to submit a review.')));
      return;
    }

    final comment = _commentController.text.trim();
    if (comment.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a review comment.')));
      return;
    }

    setState(() => _isSubmittingReview = true);
    try {
      final res = await ApiService.post('/${widget.providerId}/reviews', {
        'review': {
          'ratings': _rating.toString(),
          'comment': comment,
        }
      });
      
      if (res.statusCode == 200 || res.statusCode == 201 || res.statusCode == 302) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted successfully.')));
          Navigator.pop(context); // close bottom sheet
          _commentController.clear();
          setState(() => _rating = 5);
          _fetchProviderDetails();
        }
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to submit review.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error submitting review.')));
    } finally {
      if (mounted) setState(() => _isSubmittingReview = false);
    }
  }

  Future<void> _deleteReview(String reviewId) async {
    try {
      final res = await ApiService.delete('/provider/${widget.providerId}/review/$reviewId');
      if (res.statusCode == 200 || res.statusCode == 302) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review deleted successfully.')));
          _fetchProviderDetails();
        }
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to delete review.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Error deleting review.')));
    }
  }

  void _showReviewSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Write a Review', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Text('Rating', style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return IconButton(
                        icon: Icon(Icons.star, color: index < _rating ? Colors.amber : Colors.grey[300], size: 32),
                        onPressed: () {
                          setSheetState(() => _rating = index + 1);
                          setState(() => _rating = index + 1);
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _commentController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Share your experience...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSubmittingReview ? null : () => _submitReview(),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: _isSubmittingReview 
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('Submit Review', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            );
          }
        );
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(backgroundColor: Colors.white, elevation: 0, iconTheme: const IconThemeData(color: Colors.black)),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A))),
      );
    }

    if (_apiError || _provider == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(backgroundColor: Colors.white, elevation: 0, iconTheme: const IconThemeData(color: Colors.black)),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Failed to load profile.', style: GoogleFonts.outfit(color: Colors.grey)),
              TextButton(onPressed: _fetchProviderDetails, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final company = _provider!['company'] ?? 'Service Provider';
    final categories = _provider!['categories'] ?? '';
    final experience = _provider!['experience'] ?? '0';
    final locationRaw = _provider!['location'] ?? '';
    final description = _provider!['discription'] ?? '';
    
    final images = _provider!['personImage'] as List? ?? [];
    final gallery = _provider!['Image'] as List? ?? [];
    final imageUrl = images.isNotEmpty && images[0] is Map ? (images[0]['path'] ?? images[0]['url']) as String? : null;

    final reviews = _provider!['review'] as List? ?? [];
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

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: const Color(0xFFF9FAFB),
            pinned: true,
            iconTheme: const IconThemeData(color: Color(0xFF1E3A8A)),
          ),
          SliverToBoxAdapter(
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFFF9FAFB),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // AVATAR
                        GestureDetector(
                          onTap: () {
                            if (imageUrl != null) {
                              showDialog(
                                context: context,
                                builder: (ctx) => Dialog(
                                  backgroundColor: Colors.transparent,
                                  insetPadding: const EdgeInsets.all(16),
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      InteractiveViewer(
                                        child: Image.network(imageUrl, fit: BoxFit.contain),
                                      ),
                                      Positioned(
                                        top: 0,
                                        right: 0,
                                        child: IconButton(
                                          icon: const Icon(Icons.close, color: Colors.white, size: 32),
                                          onPressed: () => Navigator.pop(ctx),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF2563EB), width: 2), // Blue border like web
                            ),
                            child: CircleAvatar(
                              radius: 36,
                              backgroundColor: const Color(0xFFF1F5F9),
                              backgroundImage: imageUrl != null ? NetworkImage(imageUrl) : null,
                              child: imageUrl == null ? const Icon(Icons.person, size: 32, color: Colors.grey) : null,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        // TITLE & CATEGORY
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                                  Text(
                                    company,
                                    style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    categories,
                                    style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF1E3A8A)),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                              child: Row(
                                children: [
                                  const Icon(Icons.star, color: Colors.amber, size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    reviews.isNotEmpty ? avgRating.toStringAsFixed(1) : 'New',
                                    style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF92400E)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                locationRaw,
                                style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF64748B)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.work_history, size: 16, color: Color(0xFF64748B)),
                            const SizedBox(width: 8),
                            Text(
                              '$experience Years Experience',
                              style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF64748B), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        if (description.isNotEmpty) ...[
                          Text('About', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                          const SizedBox(height: 8),
                          Text(
                            description,
                            style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF475569), height: 1.5),
                          ),
                          const SizedBox(height: 24),
                        ],
                        
                        if (gallery.isNotEmpty) ...[
                          Text('Gallery', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                          const SizedBox(height: 12),
                          SizedBox(
                            height: 120,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: gallery.length,
                              itemBuilder: (context, index) {
                                final gImg = gallery[index]['url'];
                                return Container(
                                  width: 120,
                                  margin: const EdgeInsets.only(right: 12),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(12),
                                    image: DecorationImage(image: NetworkImage(gImg), fit: BoxFit.cover),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 24),
                        ],

                        _buildCalendarSection(),
                        
                        if (reviews.isNotEmpty) ...[
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Reviews', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                              TextButton(onPressed: _showReviewSheet, child: Text('Write Review', style: GoogleFonts.outfit(color: const Color(0xFF1E3A8A), fontWeight: FontWeight.bold))),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ...reviews.map((r) => _buildReviewCard(r)).toList(),
                        ] else ...[
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Reviews', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
                              TextButton(onPressed: _showReviewSheet, child: Text('Write Review', style: GoogleFonts.outfit(color: const Color(0xFF1E3A8A), fontWeight: FontWeight.bold))),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('No reviews yet. Be the first to review!', style: GoogleFonts.outfit(color: Colors.grey)),
                        ],

                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () async {
                              final phone = _provider?['phoneNO'];
                              if (phone != null && phone.toString().isNotEmpty) {
                                final uri = Uri.parse('tel:$phone');
                                if (await canLaunchUrl(uri)) {
                                  await launchUrl(uri);
                                } else {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not launch dialer for $phone')));
                                  }
                                }
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone number not available')));
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1E3A8A),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: Text('Contact Provider', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
      );
  }

  Widget _buildReviewCard(dynamic r) {
    if (r is! Map) return const SizedBox.shrink();
    final authorRaw = r['author'];
    final authorName = authorRaw is Map ? (authorRaw['name'] ?? 'User') : 'User';
    final authorId = authorRaw is Map ? (authorRaw['_id'] ?? authorRaw['id']) : null;
    final comment = r['comment'] ?? '';
    final rating = (r['ratings'] is num) ? (r['ratings'] as num).toInt() : 0;
    final reviewId = r['_id'] ?? r['id'];

    final isOwner = _currentUser != null && authorId != null && 
        (_currentUser!['_id'] == authorId || _currentUser!['id'] == authorId);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(radius: 16, backgroundColor: const Color(0xFFF1F5F9), child: Text(authorName[0].toUpperCase(), style: GoogleFonts.outfit(fontSize: 14, color: const Color(0xFF1E3A8A)))),
              const SizedBox(width: 8),
              Text(authorName, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 14, color: const Color(0xFF0F172A))),
              const Spacer(),
              Row(children: List.generate(5, (index) => Icon(Icons.star, size: 14, color: index < rating ? Colors.amber : Colors.grey[300]))),
              if (isOwner) ...[
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => _deleteReview(reviewId),
                  child: const Icon(Icons.delete_outline, color: Colors.red, size: 18),
                )
              ]
            ],
          ),
          const SizedBox(height: 8),
          Text(comment, style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF475569))),
        ],
      ),
    );
  }

  Widget _buildCalendarSection() {
    DateTime firstDayOfMonth = DateTime(_currentMonth.year, _currentMonth.month, 1);
    int daysInMonth = DateTime(_currentMonth.year, _currentMonth.month + 1, 0).day;
    int firstWeekday = firstDayOfMonth.weekday; // 1 = Mon, 7 = Sun
    int emptyPrefix = firstWeekday == 7 ? 0 : firstWeekday;

    List<String> monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    String monthLabel = '${monthNames[_currentMonth.month - 1]} ${_currentMonth.year}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(monthLabel, style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
            Row(
              children: [
                InkWell(
                  onTap: () => setState(() => _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1)),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(6)),
                    child: const Icon(Icons.chevron_left, size: 20, color: Colors.black),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => setState(() => _currentMonth = DateTime(DateTime.now().year, DateTime.now().month)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(6)),
                    child: Text('Today', style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black)),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () => setState(() => _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1)),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(border: Border.all(color: const Color(0xFFE2E8F0)), borderRadius: BorderRadius.circular(6)),
                    child: const Icon(Icons.chevron_right, size: 20, color: Colors.black),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => 
                    Expanded(child: Center(child: Text(d, style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)))))
                  ).toList(),
                ),
              ),
              GridView.builder(
                padding: const EdgeInsets.all(4),
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  childAspectRatio: 1.0,
                  crossAxisSpacing: 6,
                  mainAxisSpacing: 6,
                ),
                itemCount: emptyPrefix + daysInMonth,
                itemBuilder: (context, index) {
                  if (index < emptyPrefix) return const SizedBox.shrink();

                  int dayNum = index - emptyPrefix + 1;
                  String dateStr = '${_currentMonth.year}-${_currentMonth.month.toString().padLeft(2, '0')}-${dayNum.toString().padLeft(2, '0')}';
                  
                  var existing = _existingDays.firstWhere((day) => day is Map && day['date'] == dateStr, orElse: () => null);
                  bool isBusy = existing != null && existing is Map && existing['status'] == 'busy';

                  return Container(
                    decoration: BoxDecoration(
                      color: isBusy ? const Color(0xFFEF4444) : const Color(0xFF22C55E),
                      borderRadius: BorderRadius.circular(6)
                    ),
                    child: Center(child: Text(dayNum.toString(), style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13))),
                  );
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text('Free', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF64748B))),
            const SizedBox(width: 16),
            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text('Busy', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF64748B))),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _ph() => Container(color: const Color(0xFFF1F5F9), child: const Center(child: Icon(Icons.person, color: Color(0xFFCBD5E1), size: 64)));
}
