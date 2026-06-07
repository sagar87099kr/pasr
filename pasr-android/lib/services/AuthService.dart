// Auth service — login, register (OTP flow), verify OTP, JWT storage
// Uses a shared cookie jar so the session cookie flows across both signup requests.
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../utils/constants.dart';

import '../services/api_service.dart';

class AuthService {
  static const _tokenKey = 'jwt_token';
  static const _userKey = 'user_data';

  // ── Persist / retrieve JWT ────────────────────────────────────────────────
  static Future<void> saveToken(String token, Map user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    ApiService.clearCookies();
  }

  static Future<bool> isLoggedIn() async => (await getToken()) != null;

  // ── Login: POST /api/auth/login ──────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      ).timeout(const Duration(seconds: 12));

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] == true) {
        await saveToken(data['token'] as String, data['user'] as Map);
        ApiService.saveCookies(res);
      }
      return data;
    } catch (e) {
      debugPrint('[AuthService.login] $e');
      return {'success': false, 'message': 'Cannot reach the server. Please check that the backend is running.'};
    }
  }

  // ── Register Step 1: POST /api/auth/register ─────────────────────────────
  static Future<Map<String, dynamic>> register({
    required String name,
    required String username,
    required String password,
    required String address,
    String? referralCode,
  }) async {
    ApiService.clearCookies(); // fresh session per signup attempt
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'name': name,
          'username': username,
          'password': password,
          'address': address,
          if (referralCode != null && referralCode.isNotEmpty) 'referralCode': referralCode,
        }),
      ).timeout(const Duration(seconds: 12));

      ApiService.saveCookies(res); // save connect.sid for step 2
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[AuthService.register] $e');
      return {'success': false, 'message': 'Cannot reach the server.'};
    }
  }

  // ── Register Step 2: POST /api/auth/verify-otp ──────────────────────────
  static Future<Map<String, dynamic>> verifyOtp(String otp) async {
    try {
      final res = await ApiService.post('/api/auth/verify-otp', {'otp': otp});

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] == true) {
        await saveToken(data['token'] as String, data['user'] as Map);
        ApiService.saveCookies(res);
      }
      return data;
    } catch (e) {
      debugPrint('[AuthService.verifyOtp] $e');
      return {'success': false, 'message': 'Cannot reach the server.'};
    }
  }
  // ── Complete Profile (Progressive Profiling) ─────────────────────────────
  static Future<Map<String, dynamic>> completeProfile({
    required String name,
    required String address,
    String? additionalPhone,
  }) async {
    try {
      final res = await ApiService.post('/api/user/complete-profile', {
        'name': name,
        'address': address,
        if (additionalPhone != null && additionalPhone.isNotEmpty) 'additionalPhone': additionalPhone,
      });

      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] == true) {
        // Update local user object
        final user = await getUser();
        if (user != null) {
          user['name'] = name;
          user['address'] = address;
          if (additionalPhone != null) {
            user['additionalPhone'] = additionalPhone;
          }
          final token = await getToken();
          if (token != null) {
            await saveToken(token, user);
          }
        }
      }
      return data;
    } catch (e) {
      debugPrint('[AuthService.completeProfile] $e');
      return {'success': false, 'message': 'Cannot reach the server.'};
    }
  }
}
