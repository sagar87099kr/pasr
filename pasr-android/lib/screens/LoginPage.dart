// Mirrors: frontend/views/pages/relogin.ejs
// Login screen — WhatsApp number + password → JWT
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/AuthService.dart';
import '../screens/HomePage.dart';
import 'SignupPage.dart';

class LoginPage extends StatefulWidget {
  final bool returnToPrevious;
  const LoginPage({super.key, this.returnToPrevious = false});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _showPass = false;
  String? _errorMsg;

  static const _primary = Color(0xFF1E3A8A);
  static const _orange = Color(0xFFF97316);

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _errorMsg = null; });

    final result = await AuthService.login(_phoneCtrl.text.trim(), _passCtrl.text);

    if (!mounted) return;
    setState(() => _loading = false);

    if (result['success'] == true) {
      if (widget.returnToPrevious) {
        Navigator.pop(context, true);
      } else {
        Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomePage()),
          (_) => false,
        );
      }
    } else {
      setState(() => _errorMsg = result['message'] ?? 'Login failed. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              _buildHeader(context),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    _buildCard(),
                    const SizedBox(height: 24),
                    _buildSignupLink(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Deep-blue top strip matching the web's auth.css gradient
  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_primary, Color(0xFF1D4ED8)],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => Navigator.maybePop(context),
            child: const Icon(Icons.arrow_back_ios_new, color: Colors.white70, size: 20),
          ),
          const SizedBox(height: 24),
          const Icon(Icons.home, color: Colors.white, size: 40),
          const SizedBox(height: 12),
          Text('Welcome Back',
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Login to your PaSr account',
              style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildCard() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Error banner
            if (_errorMsg != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_errorMsg!,
                        style: GoogleFonts.outfit(color: const Color(0xFFDC2626), fontSize: 13))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // WhatsApp Number
            _label('WhatsApp Number *'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
              style: GoogleFonts.outfit(fontSize: 15),
              decoration: _inputDeco('e.g. 9876543210', Icons.phone_android_outlined),
              validator: (v) => (v == null || v.length < 10) ? 'Enter a valid 10-digit number.' : null,
            ),
            const SizedBox(height: 16),

            // Password
            _label('Password *'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _passCtrl,
              obscureText: !_showPass,
              style: GoogleFonts.outfit(fontSize: 15),
              decoration: _inputDeco('Enter your password', Icons.lock_outline).copyWith(
                suffixIcon: GestureDetector(
                  onTap: () => setState(() => _showPass = !_showPass),
                  child: Icon(_showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: Colors.grey, size: 20),
                ),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Please enter your password.' : null,
            ),
            const SizedBox(height: 8),

            // Forgot password
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {},
                child: Text('Forgot Password?',
                    style: GoogleFonts.outfit(color: _orange, fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
            const SizedBox(height: 16),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _loading ? null : _login,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: _loading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : Text('Log In', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSignupLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text("Don't have an account? ", style: GoogleFonts.outfit(color: Colors.grey, fontSize: 14)),
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SignupPage())),
          child: Text('Sign Up', style: GoogleFonts.outfit(color: _orange, fontWeight: FontWeight.w800, fontSize: 14)),
        ),
      ],
    );
  }

  Widget _label(String text) =>
      Text(text, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 13, color: const Color(0xFF374151)));

  InputDecoration _inputDeco(String hint, IconData icon) => InputDecoration(
    hintText: hint,
    hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 14),
    prefixIcon: Icon(icon, size: 20, color: Colors.grey),
    filled: true,
    fillColor: const Color(0xFFF8FAFC),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF1E3A8A), width: 2)),
    errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDC2626))),
    focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDC2626), width: 2)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  );
}
