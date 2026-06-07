import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/api_service.dart';

class AddressSearchPage extends StatefulWidget {
  const AddressSearchPage({super.key});

  @override
  State<AddressSearchPage> createState() => _AddressSearchPageState();
}

class _AddressSearchPageState extends State<AddressSearchPage> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _predictions = [];
  bool _isSearching = false;
  bool _isSaving = false;
  
  // Use the API key from the backend environment
  final String _googleApiKey = "AIzaSyDM9vgj0BTgRPVcZgQH1I88FR8vVskBoik";

  Future<void> _searchPlaces(String input) async {
    if (input.isEmpty) {
      setState(() => _predictions = []);
      return;
    }
    
    setState(() => _isSearching = true);
    
    final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=$input&key=$_googleApiKey&components=country:in');
        
    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'OK') {
          setState(() => _predictions = data['predictions']);
        } else {
          setState(() => _predictions = []);
        }
      }
    } catch (e) {
      debugPrint("Error fetching places: $e");
    } finally {
      setState(() => _isSearching = false);
    }
  }

  Future<void> _selectPlace(String placeId, String description) async {
    setState(() => _isSaving = true);
    
    final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/place/details/json?place_id=$placeId&key=$_googleApiKey');
        
    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'OK') {
          final location = data['result']['geometry']['location'];
          final lat = location['lat'];
          final lng = location['lng'];
          
          // Try to extract pincode from address components
          String pincode = "";
          final components = data['result']['address_components'];
          if (components != null) {
            for (var comp in components) {
              if ((comp['types'] as List).contains('postal_code')) {
                pincode = comp['long_name'];
                break;
              }
            }
          }

          // Save address to backend
          final saveRes = await ApiService.post('/api/user/update-address', {
            'address': description,
            'lat': lat,
            'lng': lng,
            'pincode': pincode,
          });

          if (saveRes.statusCode == 200) {
            if (mounted) {
              Navigator.pop(context, {
                'address': description,
                'lat': lat,
                'lng': lng,
              });
            }
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Failed to save address to server')),
              );
            }
          }
        }
      }
    } catch (e) {
      debugPrint("Error getting place details: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error getting address details')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Search Address', style: GoogleFonts.outfit(fontWeight: FontWeight.w700)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF1E3A8A),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search your address (e.g. Doranda Giridih)',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF6366F1)),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: _searchPlaces,
            ),
          ),
          if (_isSearching) const LinearProgressIndicator(color: Color(0xFF6366F1)),
          if (_isSaving) 
            const Padding(
              padding: EdgeInsets.all(20.0),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (!_isSaving)
            Expanded(
              child: ListView.separated(
                itemCount: _predictions.length,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final prediction = _predictions[index];
                  return ListTile(
                    leading: const Icon(Icons.location_on, color: Color(0xFF94A3B8)),
                    title: Text(prediction['description'], style: GoogleFonts.outfit()),
                    onTap: () => _selectPlace(prediction['place_id'], prediction['description']),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
