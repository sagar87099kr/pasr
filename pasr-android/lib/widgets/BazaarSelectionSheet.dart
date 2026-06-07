import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../utils/constants.dart';

class BazaarSelectionSheet extends StatefulWidget {
  final Function(String, double, double) onBazaarSelected;
  
  const BazaarSelectionSheet({Key? key, required this.onBazaarSelected}) : super(key: key);

  @override
  _BazaarSelectionSheetState createState() => _BazaarSelectionSheetState();
}

class _BazaarSelectionSheetState extends State<BazaarSelectionSheet> {
  List<dynamic> _bazaars = [];
  List<dynamic> _filteredBazaars = [];
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchBazaars();
  }

  Future<void> _fetchBazaars() async {
    try {
      final res = await ApiService.get('/api/bazaars');
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          setState(() {
            _bazaars = data['bazaars'];
            _filteredBazaars = _bazaars;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      debugPrint("Error fetching bazaars: $e");
      setState(() => _isLoading = false);
    }
  }

  void _filterBazaars(String query) {
    if (query.isEmpty) {
      setState(() => _filteredBazaars = _bazaars);
      return;
    }
    setState(() {
      _filteredBazaars = _bazaars.where((b) {
        final name = b['name'].toString().toLowerCase();
        return name.contains(query.toLowerCase());
      }).toList();
    });
  }

  Future<void> _selectBazaar(dynamic bazaar) async {
    final prefs = await SharedPreferences.getInstance();
    if (bazaar == null) {
      // Clear bazaar
      await prefs.remove('selected_bazaar_id');
      await prefs.remove('selected_bazaar_name');
      await prefs.remove('selected_bazaar_lat');
      await prefs.remove('selected_bazaar_lng');
      await ApiService.post('/api/bazaar/select-bazaar', {'bazaarName': ''});
      widget.onBazaarSelected('All Bazaars', 0.0, 0.0);
    } else {
      final lat = bazaar['geometry']['coordinates'][1];
      final lng = bazaar['geometry']['coordinates'][0];
      await prefs.setString('selected_bazaar_id', bazaar['_id']);
      await prefs.setString('selected_bazaar_name', bazaar['name']);
      await prefs.setDouble('selected_bazaar_lat', lat);
      await prefs.setDouble('selected_bazaar_lng', lng);
      await ApiService.post('/api/bazaar/select-bazaar', {'bazaarName': bazaar['name']});
      widget.onBazaarSelected(bazaar['name'], lat, lng);
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.red),
              const SizedBox(width: 8),
              Text(
                'Select Local Bazaar',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _searchController,
            onChanged: _filterBazaars,
            decoration: InputDecoration(
              hintText: 'Search bazaars...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(30),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredBazaars.isEmpty
                    ? const Center(child: Text("No bazaars found"))
                    : ListView.builder(
                        itemCount: _filteredBazaars.length,
                        itemBuilder: (context, index) {
                          final b = _filteredBazaars[index];
                          return ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Color(0xFFEFF6FF),
                              child: Icon(Icons.storefront, color: Color(0xFF1E3A8A)), // assuming kPrimaryColor or similar, but avoiding const error
                            ),
                            title: Text(b['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text(b['location'] ?? ''),
                            onTap: () => _selectBazaar(b),
                          );
                        },
                      ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.public, color: Colors.red),
              label: const Text('Show All (Clear Selection)', style: TextStyle(color: Colors.red)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: () => _selectBazaar(null),
            ),
          )
        ],
      ),
    );
  }
}
