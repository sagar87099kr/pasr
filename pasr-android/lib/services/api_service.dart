import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class ApiService {
  static final _cookieJar = <String, String>{};
  static bool _cookiesLoaded = false;

  static Future<void> _loadCookies() async {
    if (_cookiesLoaded) return;
    final prefs = await SharedPreferences.getInstance();
    final savedCookies = prefs.getString('saved_cookies');
    if (savedCookies != null) {
      try {
        final Map<String, dynamic> decoded = jsonDecode(savedCookies);
        for (var entry in decoded.entries) {
          _cookieJar[entry.key] = entry.value.toString();
        }
      } catch (e) {
        debugPrint('Error loading cookies: $e');
      }
    }
    _cookiesLoaded = true;
  }

  static Future<void> _persistCookies() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('saved_cookies', jsonEncode(_cookieJar));
  }

  static Map<String, String> get _cookieHeaders =>
      _cookieJar.isEmpty ? {} : {'Cookie': _cookieJar.entries.map((e) => '${e.key}=${e.value}').join('; ')};

  static void saveCookies(http.Response response) {
    final setCookies = response.headers['set-cookie'];
    if (setCookies != null) {
      bool changed = false;
      for (final cookie in setCookies.split(RegExp(r',(?=[^ ])'))) {
        final fullPair = cookie.split(';').first.trim();
        final firstEqualIdx = fullPair.indexOf('=');
        if (firstEqualIdx != -1) {
          final name = fullPair.substring(0, firstEqualIdx).trim();
          final value = fullPair.substring(firstEqualIdx + 1).trim();
          _cookieJar[name] = value;
          changed = true;
        }
      }
      if (changed) _persistCookies();
    }
  }

  static Future<void> clearCookies() async {
    _cookieJar.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('saved_cookies');
  }

  static Future<Map<String, String>> _getHeaders() async {
    await _loadCookies();
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    
    final bLat = prefs.getDouble('selected_bazaar_lat');
    final bLng = prefs.getDouble('selected_bazaar_lng');
    final bId = prefs.getString('selected_bazaar_id');

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      if (bId != null) 'X-Bazaar-Id': bId,
      if (bLat != null && bLng != null) 'X-Bazaar-Lat': bLat.toString(),
      if (bLat != null && bLng != null) 'X-Bazaar-Lng': bLng.toString(),
      ..._cookieHeaders,
    };
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$kBaseUrl$endpoint'), headers: headers).timeout(const Duration(seconds: 15));
    saveCookies(res);
    return res;
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final res = await http.post(Uri.parse('$kBaseUrl$endpoint'), headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 15));
    saveCookies(res);
    return res;
  }

  static Future<http.Response> put(String endpoint, Map<String, dynamic> body) async {
    final headers = await _getHeaders();
    final res = await http.put(Uri.parse('$kBaseUrl$endpoint'), headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 15));
    saveCookies(res);
    return res;
  }

  static Future<http.Response> delete(String endpoint) async {
    final headers = await _getHeaders();
    final res = await http.delete(Uri.parse('$kBaseUrl$endpoint'), headers: headers).timeout(const Duration(seconds: 15));
    saveCookies(res);
    return res;
  }

  static Future<http.Response> postMultipart(String endpoint, Map<String, String> fields, {String? fileField, String? filePath}) async {
    final headers = await _getHeaders();
    // Remove Content-Type so http.MultipartRequest can set it properly with boundary
    headers.remove('Content-Type');

    final request = http.MultipartRequest('POST', Uri.parse('$kBaseUrl$endpoint'));
    request.headers.addAll(headers);
    request.fields.addAll(fields);

    if (fileField != null && filePath != null) {
      request.files.add(await http.MultipartFile.fromPath(fileField, filePath));
    }

    final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
    final res = await http.Response.fromStream(streamedResponse);
    saveCookies(res);
    return res;
  }

  // Legacy fetchDiscovery
  static Future<Map<String, dynamic>?> fetchDiscovery({
    double? lat,
    double? lon,
  }) async {
    try {
      String url = '/api/discovery';
      if (lat != null && lon != null) {
        url += '?lat=$lat&lon=$lon';
      }
      final response = await get(url);
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        if (json['success'] == true) return json['data'];
      }
    } catch (e) {
      debugPrint('[ApiService] fetchDiscovery error: $e');
    }
    return null;
  }
}
