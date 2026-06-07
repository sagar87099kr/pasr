// Mirrors: frontend/views/pages/customer.ejs
// Signup screen — Name, Phone, Password, Address, Referral → OTP → Account created
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/AuthService.dart';
import '../screens/HomePage.dart';
import 'LoginPage.dart';

class SignupPage extends StatefulWidget {
  const SignupPage({super.key});
  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  // Step 1 = signup form, Step 2 = OTP verification
  int _step = 1;

  final _formKey = GlobalKey<FormState>();
  final _phoneCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confCtrl = TextEditingController();
  final _referralCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();

  bool _loading = false;
  bool _showPass = false;
  bool _showConf = false;
  bool _agreedToTerms = false;
  String? _errorMsg;

  static const _primary = Color(0xFF1E3A8A);
  static const _orange = Color(0xFFF97316);
  static const _green = Color(0xFF16A34A);

  @override
  void dispose() {
    _phoneCtrl.dispose(); _passCtrl.dispose();
    _confCtrl.dispose(); _referralCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  // ── Step 1: Submit registration form ───────────────────────────────────────
  Future<void> _submitRegistration() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreedToTerms) {
      setState(() => _errorMsg = 'Please agree to the Terms and Conditions.');
      return;
    }
    setState(() { _loading = true; _errorMsg = null; });

    final result = await AuthService.register(
      name: '',
      username: _phoneCtrl.text.trim(),
      password: _passCtrl.text,
      address: '',
      referralCode: _referralCtrl.text.trim().isEmpty ? null : _referralCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _loading = false);

    if (result['success'] == true) {
      setState(() { _step = 2; _errorMsg = null; });
    } else {
      setState(() => _errorMsg = result['message'] ?? 'Registration failed. Please try again.');
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.trim().length != 6) {
      setState(() => _errorMsg = 'Please enter the 6-digit OTP.');
      return;
    }
    setState(() { _loading = true; _errorMsg = null; });

    final result = await AuthService.verifyOtp(_otpCtrl.text.trim());

    if (!mounted) return;
    setState(() => _loading = false);

    if (result['success'] == true) {
      Navigator.of(context, rootNavigator: true).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomePage()),
        (_) => false,
      );
    } else {
      setState(() => _errorMsg = result['message'] ?? 'OTP verification failed.');
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
                    _step == 1 ? _buildSignupCard() : _buildOtpCard(),
                    const SizedBox(height: 24),
                    _buildLoginLink(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────
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
            onTap: () {
              if (_step == 2) {
                setState(() { _step = 1; _errorMsg = null; });
              } else {
                Navigator.maybePop(context);
              }
            },
            child: const Icon(Icons.arrow_back_ios_new, color: Colors.white70, size: 20),
          ),
          const SizedBox(height: 24),
          const Icon(Icons.home, color: Colors.white, size: 40),
          const SizedBox(height: 12),
          Text(_step == 1 ? 'Create Account' : 'Verify OTP',
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text(_step == 1 ? 'Join PaSr and find the best local services'
              : 'Enter the 6-digit OTP sent to your WhatsApp',
              style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 16),
          // Step indicator
          Row(
            children: [
              _stepDot(1, _step >= 1, 'Details'),
              Expanded(child: Container(height: 2, color: _step >= 2 ? _orange : Colors.white24)),
              _stepDot(2, _step >= 2, 'Verify'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _stepDot(int n, bool active, String label) {
    return Column(
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: active ? _orange : Colors.white24,
          child: Text('$n', style: GoogleFonts.outfit(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
        ),
        const SizedBox(height: 4),
        Text(label, style: GoogleFonts.outfit(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.w600)),
      ],
    );
  }

  // ── Step 1: Signup Form ─────────────────────────────────────────────────────
  Widget _buildSignupCard() {
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
            // Info notice
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFF3B82F6), size: 16),
                  const SizedBox(width: 8),
                  Text('Fields marked with (*) are mandatory',
                      style: GoogleFonts.outfit(color: const Color(0xFF1E40AF), fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (_errorMsg != null) ...[_errorBanner(), const SizedBox(height: 16)],



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
            const SizedBox(height: 14),

            // Password + Confirm (side by side)
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('Password *'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _passCtrl,
                        obscureText: !_showPass,
                        style: GoogleFonts.outfit(fontSize: 14),
                        decoration: _inputDeco('Min 4 chars', Icons.lock_outline).copyWith(
                          suffixIcon: GestureDetector(
                            onTap: () => setState(() => _showPass = !_showPass),
                            child: Icon(_showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.grey, size: 18),
                          ),
                        ),
                        validator: (v) => (v == null || v.length < 4) ? 'Min 4 characters.' : null,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _label('Confirm *'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _confCtrl,
                        obscureText: !_showConf,
                        style: GoogleFonts.outfit(fontSize: 14),
                        decoration: _inputDeco('Repeat', Icons.lock_outline).copyWith(
                          suffixIcon: GestureDetector(
                            onTap: () => setState(() => _showConf = !_showConf),
                            child: Icon(_showConf ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: Colors.grey, size: 18),
                          ),
                        ),
                        validator: (v) => v != _passCtrl.text ? 'Passwords must match.' : null,
                      ),
                    ],
                  ),
                ),
              ],
            ),


            // Referral Code (Optional)
            _label('Referral Code (Optional)'),
            const SizedBox(height: 6),
            TextFormField(
              controller: _referralCtrl,
              textCapitalization: TextCapitalization.characters,
              style: GoogleFonts.outfit(fontSize: 15),
              decoration: _inputDeco('Enter referral code if you have one', Icons.card_giftcard_outlined),
            ),
            const SizedBox(height: 16),

            // Terms checkbox
            GestureDetector(
              onTap: () => setState(() => _agreedToTerms = !_agreedToTerms),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 24, height: 24,
                    child: Checkbox(
                      value: _agreedToTerms,
                      onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
                      activeColor: _primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: RichText(
                      text: TextSpan(
                        style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF374151)),
                        children: [
                          const TextSpan(text: 'I agree to the '),
                          TextSpan(
                            text: 'Terms and Conditions',
                            style: GoogleFonts.outfit(color: _primary, fontWeight: FontWeight.w700, decoration: TextDecoration.underline),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Submit
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _loading ? null : _submitRegistration,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: _loading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : Text('Create Account', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Step 2: OTP Verification ─────────────────────────────────────────────────
  Widget _buildOtpCard() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          // WhatsApp icon
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(color: const Color(0xFFF0FDF4), shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFBBF7D0), width: 2)),
            child: const Icon(Icons.message_outlined, color: _green, size: 32),
          ),
          const SizedBox(height: 16),
          Text('Check your WhatsApp',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A))),
          const SizedBox(height: 8),
          Text('We sent a 6-digit OTP to\n+91 ${_phoneCtrl.text.trim()}',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade600, height: 1.5)),
          const SizedBox(height: 24),

          if (_errorMsg != null) ...[_errorBanner(), const SizedBox(height: 16)],

          // OTP input
          TextFormField(
            controller: _otpCtrl,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 10),
            decoration: InputDecoration(
              hintText: '------',
              hintStyle: GoogleFonts.outfit(fontSize: 24, letterSpacing: 10, color: Colors.grey.shade300),
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: _primary, width: 2)),
              contentPadding: const EdgeInsets.symmetric(vertical: 18),
            ),
          ),
          const SizedBox(height: 24),

          // Verify button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _loading ? null : _verifyOtp,
              style: ElevatedButton.styleFrom(
                backgroundColor: _green,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: _loading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                  : Text('Verify & Create Account', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800)),
            ),
          ),
          const SizedBox(height: 12),

          // Resend
          TextButton(
            onPressed: _loading ? null : _submitRegistration,
            child: Text("Didn't receive it? Resend OTP",
                style: GoogleFonts.outfit(color: _orange, fontWeight: FontWeight.w700, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginLink() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text('Already have an account? ', style: GoogleFonts.outfit(color: Colors.grey, fontSize: 14)),
        GestureDetector(
          onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginPage())),
          child: Text('Log In', style: GoogleFonts.outfit(color: _orange, fontWeight: FontWeight.w800, fontSize: 14)),
        ),
      ],
    );
  }

  Widget _errorBanner() => Container(
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
        Expanded(child: Text(_errorMsg!, style: GoogleFonts.outfit(color: const Color(0xFFDC2626), fontSize: 13))),
      ],
    ),
  );

  Widget _label(String text) =>
      Text(text, style: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 13, color: const Color(0xFF374151)));

  InputDecoration _inputDeco(String hint, IconData icon) => InputDecoration(
    hintText: hint,
    hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 13),
    prefixIcon: Icon(icon, size: 20, color: Colors.grey),
    filled: true,
    fillColor: const Color(0xFFF8FAFC),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _primary, width: 2)),
    errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDC2626))),
    focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFDC2626), width: 2)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  );
}
