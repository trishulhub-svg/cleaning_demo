#!/usr/bin/env python3
"""
PHP/MySQL to Vercel + Turso Migration Guide - Body PDF Generator
ReportLab pipeline with TOC, code blocks, and tables.
"""
import os, hashlib
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, CondPageBreak, Flowable, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FONT REGISTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pdfmetrics.registerFont(TTFont('TimesNewRoman', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('TimesNewRomanB', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/Carlito-Regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMonoB', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
registerFontFamily('TimesNewRoman', normal='TimesNewRoman', bold='TimesNewRomanB')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')
registerFontFamily('DejaVuMono', normal='DejaVuMono', bold='DejaVuMonoB')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CASCADE PALETTE (auto-generated)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_BG       = colors.HexColor('#f6f6f5')
SECTION_BG    = colors.HexColor('#f1f0ef')
CARD_BG       = colors.HexColor('#f0efed')
TABLE_STRIPE  = colors.HexColor('#ececea')
HEADER_FILL   = colors.HexColor('#766944')
COVER_BLOCK   = colors.HexColor('#746b51')
BORDER        = colors.HexColor('#cfcabe')
ICON_COLOR    = colors.HexColor('#a38c45')
ACCENT        = colors.HexColor('#2298bf')
ACCENT_2      = colors.HexColor('#54cc54')
TEXT_PRIMARY   = colors.HexColor('#1c1b19')
TEXT_MUTED     = colors.HexColor('#797770')
SEM_SUCCESS   = colors.HexColor('#3d8555')
SEM_WARNING   = colors.HexColor('#af8e4c')
SEM_ERROR     = colors.HexColor('#97443c')
SEM_INFO      = colors.HexColor('#4c7ba9')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = TABLE_STRIPE

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PAGE CONFIG
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE_W, PAGE_H = A4
LEFT_MARGIN = 1.0 * inch
RIGHT_MARGIN = 1.0 * inch
TOP_MARGIN = 0.9 * inch
BOTTOM_MARGIN = 0.9 * inch
AVAILABLE_W = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

OUTPUT_PATH = '/home/z/my-project/download/migration-guide-body.pdf'

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STYLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
styles = getSampleStyleSheet()

s_title = ParagraphStyle(
    'DocTitle', fontName='TimesNewRoman', fontSize=26, leading=32,
    textColor=TEXT_PRIMARY, spaceAfter=6, alignment=TA_LEFT,
)
s_h1 = ParagraphStyle(
    'H1', fontName='TimesNewRoman', fontSize=20, leading=26,
    textColor=HEADER_FILL, spaceBefore=18, spaceAfter=10, alignment=TA_LEFT,
)
s_h2 = ParagraphStyle(
    'H2', fontName='TimesNewRoman', fontSize=15, leading=20,
    textColor=TEXT_PRIMARY, spaceBefore=14, spaceAfter=8, alignment=TA_LEFT,
)
s_h3 = ParagraphStyle(
    'H3', fontName='TimesNewRoman', fontSize=12, leading=16,
    textColor=ACCENT, spaceBefore=10, spaceAfter=6, alignment=TA_LEFT,
)
s_body = ParagraphStyle(
    'Body', fontName='TimesNewRoman', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_JUSTIFY,
)
s_body_left = ParagraphStyle(
    'BodyLeft', fontName='TimesNewRoman', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=6, alignment=TA_LEFT,
)
s_code = ParagraphStyle(
    'Code', fontName='DejaVuMono', fontSize=8.5, leading=13,
    textColor=TEXT_PRIMARY, backColor=colors.HexColor('#f5f4f3'),
    leftIndent=12, rightIndent=12, spaceBefore=4, spaceAfter=4,
    borderColor=BORDER, borderWidth=0.5, borderPadding=6,
    alignment=TA_LEFT,
)
s_code_inline = ParagraphStyle(
    'CodeInline', fontName='DejaVuMono', fontSize=8.5, leading=13,
    textColor=TEXT_PRIMARY, backColor=colors.HexColor('#f5f4f3'),
    leftIndent=8, rightIndent=8, spaceBefore=2, spaceAfter=2,
    borderColor=BORDER, borderWidth=0.5, borderPadding=4,
    alignment=TA_LEFT,
)
s_bullet = ParagraphStyle(
    'Bullet', fontName='TimesNewRoman', fontSize=10.5, leading=17,
    textColor=TEXT_PRIMARY, spaceBefore=1, spaceAfter=3, alignment=TA_LEFT,
    leftIndent=24, bulletIndent=12,
)
s_table_header = ParagraphStyle(
    'TH', fontName='TimesNewRoman', fontSize=9.5, leading=14,
    textColor=colors.white, alignment=TA_CENTER,
)
s_table_cell = ParagraphStyle(
    'TC', fontName='TimesNewRoman', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_LEFT,
)
s_table_cell_center = ParagraphStyle(
    'TCC', fontName='TimesNewRoman', fontSize=9.5, leading=14,
    textColor=TEXT_PRIMARY, alignment=TA_CENTER,
)
s_caption = ParagraphStyle(
    'Caption', fontName='TimesNewRoman', fontSize=9, leading=13,
    textColor=TEXT_MUTED, alignment=TA_CENTER,
    spaceBefore=3, spaceAfter=6,
)
s_warning = ParagraphStyle(
    'Warning', fontName='TimesNewRoman', fontSize=10, leading=15,
    textColor=SEM_WARNING, spaceBefore=6, spaceAfter=6, alignment=TA_LEFT,
    leftIndent=12, borderColor=SEM_WARNING, borderWidth=1.5, borderPadding=8,
    backColor=colors.HexColor('#fdf8ef'),
)
s_note = ParagraphStyle(
    'Note', fontName='TimesNewRoman', fontSize=10, leading=15,
    textColor=SEM_INFO, spaceBefore=6, spaceAfter=6, alignment=TA_LEFT,
    leftIndent=12, borderColor=SEM_INFO, borderWidth=1, borderPadding=8,
    backColor=colors.HexColor('#eef4f9'),
)
s_toc_h1 = ParagraphStyle(
    'TOCH1', fontName='TimesNewRoman', fontSize=13, leftIndent=20,
    spaceBefore=4, spaceAfter=2,
)
s_toc_h2 = ParagraphStyle(
    'TOCH2', fontName='TimesNewRoman', fontSize=11, leftIndent=40,
    spaceBefore=2, spaceAfter=1, textColor=TEXT_MUTED,
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TOC DOC TEMPLATE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

H1_ORPHAN = (PAGE_H - TOP_MARGIN - BOTTOM_MARGIN) * 0.15

def add_heading(text, style, level=0):
    key = 'h_%s' % hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = text
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def h1(text):
    return [CondPageBreak(H1_ORPHAN), add_heading('<b>%s</b>' % text, s_h1, level=0)]

def h2(text):
    return [add_heading('<b>%s</b>' % text, s_h2, level=1)]

def h3(text):
    return [add_heading('<b>%s</b>' % text, s_h3, level=2)]

def body(text):
    return [Paragraph(text, s_body)]

def bullet(text):
    return [Paragraph(text, s_bullet)]

def code(text):
    return [Paragraph(text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'), s_code)]

def warning(text):
    return [Paragraph('<b>WARNING:</b> ' + text, s_warning)]

def note(text):
    return [Paragraph('<b>NOTE:</b> ' + text, s_note)]

def hr():
    return [HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceBefore=6, spaceAfter=6)]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TABLE HELPER
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
def make_table(headers, rows, col_ratios=None):
    """Build a styled table with Paragraph-wrapped cells."""
    n = len(headers)
    if col_ratios is None:
        col_ratios = [1.0 / n] * n
    cw = [r * AVAILABLE_W for r in col_ratios]
    # Ensure sum doesn't exceed available width
    total = sum(cw)
    if total > AVAILABLE_W:
        scale = AVAILABLE_W / total
        cw = [w * scale for w in cw]

    data = [[Paragraph('<b>%s</b>' % h, s_table_header) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), s_table_cell) for c in row])

    t = Table(data, colWidths=cw, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, TEXT_MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(data)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style_cmds))
    return t

def spacer(pts=12):
    return [Spacer(1, pts)]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD STORY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
story = []

# ── TABLE OF CONTENTS ──
story.append(Paragraph('<b>Table of Contents</b>', s_title))
story.append(Spacer(1, 12))
toc = TableOfContents()
toc.levelStyles = [s_toc_h1, s_toc_h2]
story.append(toc)
story.append(PageBreak())

# ════════════════════════════════════════════════════════
# STAGE 1: AUDIT & COMPATIBILITY CHECK
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 1: Audit and Compatibility Check'))
story.extend(body(
    'Before writing a single line of code or pushing any file to GitHub, you must conduct a thorough audit of your existing PHP/MySQL project. This stage determines the feasibility of running your application on Vercel, identifies incompatible features that need refactoring, and helps you decide whether Vercel is even the right platform for your workload. Skipping this audit is the single most common cause of failed migrations.'
))
story.extend(body(
    'The audit covers three dimensions: PHP feature compatibility with Vercel\'s execution model, database migration complexity from MySQL to Turso (LibSQL), and architectural fit between your application\'s patterns and Vercel\'s serverless paradigm. Each dimension has specific checkpoints that will inform the refactoring effort required in subsequent stages.'
))

story.extend(h2('1.1 Vercel PHP Runtime: The Reality'))
story.extend(body(
    'Vercel does not have an officially supported PHP runtime. Vercel\'s native runtimes are limited to Node.js, Go, Python, and Ruby. However, PHP can run on Vercel through two mechanisms. The first is the community-maintained PHP runtime via the <b>@vercel/php</b> builder, which uses a custom Buildpack under the hood. This builder compiles PHP from source and creates serverless functions from your PHP files. The second approach involves converting PHP files into serverless API routes where each <font name="DejaVuMono" size="8.5">.php</font> file becomes a serverless function that handles HTTP requests.'
))
story.extend(body(
    'The community runtime supports PHP 8.x and common extensions like <font name="DejaVuMono" size="8.5">pdo_mysql</font>, <font name="DejaVuMono" size="8.5">mysqli</font>, <font name="DejaVuMono" size="8.5">mbstring</font>, <font name="DejaVuMono" size="8.5">openssl</font>, <font name="DejaVuMono" size="8.5">curl</font>, and <font name="DejaVuMono" size="8.5">gd</font>. However, it has significant limitations that you must understand before proceeding. Each PHP file is deployed as an independent serverless function with its own cold-start time (typically 200-500ms for PHP). There is no persistent filesystem between requests: any file written during one invocation is gone in the next. There are strict execution timeouts (10 seconds for hobby, 60 seconds for pro plans). Background processes, cron jobs, and long-running tasks are not supported.'
))

story.extend(h2('1.2 Incompatible Features Checklist'))
story.extend(body(
    'Review your codebase against this checklist. Any item marked "Incompatible" will require refactoring or an alternative approach. The severity column indicates how difficult the workaround will be.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Feature', 'Vercel Compatible?', 'Workaround', 'Severity'],
    [
        ['mysql_* functions (deprecated)', 'No', 'Replace with PDO or Turso SDK', 'Medium'],
        ['PDO/MySQLi persistent connections', 'No', 'Connection per request (stateless)', 'Low'],
        ['Local file writes (uploads, logs)', 'No', 'Use S3/Upstash/object storage', 'High'],
        ['PHP sessions (file-based)', 'No', 'Use KV store (Upstash Redis)', 'Medium'],
        ['Cron jobs / scheduled tasks', 'No', 'External scheduler (cron-job.org)', 'Medium'],
        ['$_SERVER["DOCUMENT_ROOT"]', 'Limited', 'Use __DIR__ or env vars', 'Low'],
        ['.htaccess / Apache config', 'No', 'Use vercel.json rewrites', 'Medium'],
        ['Header() redirects', 'Yes', 'Works normally in serverless', 'None'],
        ['JSON API endpoints', 'Yes', 'Works perfectly as serverless', 'None'],
        ['Static file serving', 'Yes', 'Place in /public directory', 'None'],
    ],
    [0.20, 0.15, 0.38, 0.12],
))
story.append(Paragraph('Table 1: PHP Feature Compatibility Matrix for Vercel', s_caption))
story.extend(spacer(6))

story.extend(h2('1.3 When to Choose an Alternative Platform'))
story.extend(body(
    'Vercel is ideal for static sites, serverless APIs, and frontend-heavy applications. However, if your PHP application relies heavily on any of the following, you should seriously consider alternative hosting platforms. Traditional PHP apps with heavy session usage (e-commerce carts, user authentication flows that depend on server-side sessions) will require significant refactoring. Applications that process large file uploads (image galleries, document management systems) cannot use Vercel\'s ephemeral filesystem. Projects with background workers (email queues, report generation, data processing) need a persistent runtime environment.'
))
story.extend(body(
    'For these scenarios, consider the following alternatives. <b>Railway</b> offers native PHP support with persistent filesystem, proper cron jobs, and MySQL/PostgreSQL databases starting at $5/month. <b>Render</b> provides PHP web services with persistent disks, background workers, and free SSL certificates. <b>Hostinger</b> or traditional shared hosting remains the simplest option if your application is a standard PHP website that does not need the edge deployment benefits of Vercel. The decision matrix below can help you choose.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Criterion', 'Vercel + Turso', 'Railway', 'Render', 'Traditional Hosting'],
    [
        ['PHP support', 'Community runtime', 'Native', 'Native', 'Native'],
        ['Persistent filesystem', 'No', 'Yes', 'Yes (disk)', 'Yes'],
        ['MySQL/MariaDB', 'No (Turso only)', 'Yes (managed)', 'Yes (managed)', 'Yes (included)'],
        ['Session handling', 'Requires external KV', 'Native', 'Native', 'Native'],
        ['Cron jobs', 'No', 'Yes', 'Yes (cron)', 'Yes (cPanel)'],
        ['Cold start latency', '200-500ms', 'None (persistent)', 'None (persistent)', 'None'],
        ['Edge deployment', 'Yes (global)', 'No', 'No', 'No'],
        ['Cost (starter)', 'Free tier available', '$5/month', 'Free tier available', '$2-5/month'],
        ['Best for', 'APIs, static + API', 'Full-stack PHP', 'Full-stack PHP', 'Traditional PHP sites'],
    ],
    [0.16, 0.21, 0.21, 0.21, 0.21],
))
story.append(Paragraph('Table 2: Platform Comparison for PHP Applications', s_caption))
story.extend(spacer(6))

story.extend(warning(
    'If your application has more than 3 incompatible features from Table 1, strongly consider Railway or Render instead of Vercel. The refactoring cost may exceed the benefits of Vercel\'s edge deployment.'
))

# ════════════════════════════════════════════════════════
# STAGE 2: GITHUB PREPARATION
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 2: GitHub Preparation'))
story.extend(body(
    'With the audit complete, the next step is to initialize Git version control for your project and push it to GitHub. This is not just a deployment prerequisite; it is a fundamental best practice for any production project. GitHub provides version history, collaboration capabilities, CI/CD integration via GitHub Actions, and serves as the source of truth that Vercel connects to for automatic deployments.'
))

story.extend(h2('2.1 Initialize Git Locally'))
story.extend(body(
    'Navigate to your project root directory (the top-level folder of your XAMPP htdocs project) and run the following commands. These commands initialize a new Git repository, configure your identity (required for commits), and prepare the project for its first commit. Replace the name and email with your actual GitHub credentials.'
))

story.extend(spacer(4))
story.extend(code('# Navigate to your project root (e.g., C:/xampp/htdocs/myproject)'))
story.extend(code('cd /path/to/your/project'))
story.extend(code(''))
story.extend(code('# Initialize Git repository'))
story.extend(code('git init'))
story.extend(code(''))
story.extend(code('# Configure your identity (one-time setup)'))
story.extend(code('git config user.name "Your Name"'))
story.extend(code('git config user.email "your.email@example.com"'))
story.extend(spacer(4))

story.extend(h2('2.2 Create .gitignore File'))
story.extend(body(
    'The <font name="DejaVuMono" size="8.5">.gitignore</font> file is critical. Without it, you will accidentally commit XAMPP-specific files, database credentials, and temporary files to your public repository. The following <font name="DejaVuMono" size="8.5">.gitignore</font> covers the most common files that should never be tracked in version control. Create this file in your project root.'
))

story.extend(spacer(4))
story.extend(code('# === XAMPP / Local Environment ==='))
story.extend(code('xampp/'))
story.extend(code('htdocs/'))
story.extend(code('.htaccess.bak'))
story.extend(code(''))
story.extend(code('# === PHP ==='))
story.extend(code('vendor/'))
story.extend(code('composer.lock'))
story.extend(code('*.cache'))
story.extend(code(''))
story.extend(code('# === Environment & Secrets ==='))
story.extend(code('.env'))
story.extend(code('.env.local'))
story.extend(code('.env.production'))
story.extend(code('.env.*.local'))
story.extend(code('config.php'))
story.extend(code('database_credentials.php'))
story.extend(code(''))
story.extend(code('# === Uploads & Generated Files ==='))
story.extend(code('uploads/'))
story.extend(code('tmp/'))
story.extend(code('logs/'))
story.extend(code('cache/'))
story.extend(code(''))
story.extend(code('# === OS Files ==='))
story.extend(code('.DS_Store'))
story.extend(code('Thumbs.db'))
story.extend(code('desktop.ini'))
story.extend(code(''))
story.extend(code('# === IDE ==='))
story.extend(code('.vscode/'))
story.extend(code('.idea/'))
story.extend(code('*.swp'))
story.extend(code('*.swo'))
story.extend(code(''))
story.extend(code('# === Node (if using Vercel CLI) ==='))
story.extend(code('node_modules/'))
story.extend(code('.vercel/'))
story.extend(spacer(4))

story.extend(h2('2.3 Remove XAMPP-Specific Files'))
story.extend(body(
    'Before making your first commit, remove any files that reference localhost URLs, absolute XAMPP paths, or contain database credentials stored in plain text. Common patterns include configuration files with hardcoded connection strings, PHP files with paths like <font name="DejaVuMono" size="8.5">C:/xampp/htdocs/...</font>, and any backup files generated by XAMPP or your editor. Use the following commands to identify and remove these references.'
))

story.extend(spacer(4))
story.extend(code('# Find files with localhost references'))
story.extend(code('# (Review output carefully before deleting)'))
story.extend(code('grep -rl "localhost" --include="*.php" .'))
story.extend(code('grep -rl "127.0.0.1" --include="*.php" .'))
story.extend(code('grep -rl "C:/xampp" --include="*.php" .'))
story.extend(code(''))
story.extend(code('# Remove XAMPP-specific files if present'))
story.extend(code('rm -f .htaccess.bak'))
story.extend(code('rm -rf xampp_backup/'))
story.extend(spacer(4))

story.extend(h2('2.4 First Commit and Push to GitHub'))
story.extend(body(
    'After creating the repository on GitHub (at github.com/new), push your local code. Create the repository as Private if your project contains any sensitive business logic. Use the following commands to stage all files, create the initial commit, and push to the remote repository.'
))

story.extend(spacer(4))
story.extend(code('# Stage all files'))
story.extend(code('git add .'))
story.extend(code(''))
story.extend(code('# Create initial commit'))
story.extend(code('git commit -m "feat: initial commit - PHP project structure"'))
story.extend(code(''))
story.extend(code('# Add remote origin (replace with your repo URL)'))
story.extend(code('git remote add origin https://github.com/[YOUR_GITHUB_REPO].git'))
story.extend(code(''))
story.extend(code('# Push to main branch'))
story.extend(code('git branch -M main'))
story.extend(code('git push -u origin main'))
story.extend(spacer(4))

story.extend(note(
    'If your project has a <font name="DejaVuMono" size="8.5">config.php</font> or <font name="DejaVuMono" size="8.5">db.php</font> with hardcoded credentials, create a <font name="DejaVuMono" size="8.5">config.example.php</font> with placeholder values and commit that instead. Add the real config file to .gitignore. This is covered in detail in Stage 7.'
))

story.extend(h2('2.5 Recommended Repository Structure'))
story.extend(body(
    'Organize your project following this structure before pushing to GitHub. This layout is compatible with both Vercel\'s deployment expectations and standard PHP project conventions. The key principle is that all publicly accessible files (CSS, JavaScript, images) go in the <font name="DejaVuMono" size="8.5">public/</font> directory, while PHP logic files remain at the root or in an <font name="DejaVuMono" size="8.5">api/</font> directory.'
))

story.extend(spacer(4))
story.extend(code('myproject/'))
story.extend(code('  |-- public/              # Static assets served by Vercel'))
story.extend(code('  |     |-- css/'))
story.extend(code('  |     |-- js/'))
story.extend(code('  |     |-- images/'))
story.extend(code('  |     |-- index.php      # Entry point'))
story.extend(code('  |-- api/                 # Serverless API endpoints'))
story.extend(code('  |     |-- users.php'))
story.extend(code('  |     |-- products.php'))
story.extend(code('  |     |-- auth.php'))
story.extend(code('  |-- config/'))
story.extend(code('  |     |-- database.php   # DB connection (reads from env)'))
story.extend(code('  |     |-- app.php        # App-level config'))
story.extend(code('  |-- includes/            # Shared PHP files'))
story.extend(code('  |     |-- functions.php'))
story.extend(code('  |     |-- headers.php'))
story.extend(code('  |     |-- auth.php'))
story.extend(code('  |-- .gitignore'))
story.extend(code('  |-- .env.example         # Template for environment variables'))
story.extend(code('  |-- vercel.json          # Vercel configuration'))
story.extend(code('  |-- composer.json         # PHP dependencies'))
story.extend(spacer(4))


# ════════════════════════════════════════════════════════
# STAGE 3: MIGRATING MYSQL TO TURSO
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 3: Migrating MySQL to Turso'))
story.extend(body(
    'Turso is a distributed SQLite-compatible database built on libSQL, an open-source fork of SQLite. It provides edge-deployed database replicas with automatic synchronization, which makes it an excellent choice for serverless applications. However, migrating from MySQL requires understanding the fundamental differences between the two database systems, as they are not fully compatible despite both supporting SQL.'
))

story.extend(h2('3.1 Understanding Turso Architecture'))
story.extend(body(
    'Turso operates on a unique architecture that differs significantly from traditional MySQL databases. The core database engine is libSQL, which is SQLite-compatible with additional features like remote authentication, network replication, and built-in branching. When you create a Turso database, it runs on Turso\'s infrastructure with the primary replica in a specific region (e.g., <font name="DejaVuMono" size="8.5">eu-west-1</font> or <font name="DejaVuMono" size="8.5">us-east-1</font>). You can create additional read-only replicas in other regions for low-latency reads.'
))
story.extend(body(
    'Connections are made over HTTPS using a URL format: <font name="DejaVuMono" size="8.5">libsql://[YOUR_DB_NAME]-[YOUR_ORG].turso.io</font>. Authentication is handled via an auth token that you generate from the Turso CLI or dashboard. All queries are sent over HTTP, which means there is no persistent TCP connection like MySQL. This fits naturally with Vercel\'s serverless model where each function invocation is independent.'
))

story.extend(h2('3.2 MySQL vs LibSQL: Key Differences'))
story.extend(body(
    'While both databases support SQL, there are critical syntax and behavioral differences that will affect your migration. Understanding these differences before writing any migration scripts will save you significant debugging time. The most impactful differences relate to data types, auto-increment behavior, and SQL function compatibility.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Feature', 'MySQL', 'Turso (LibSQL)', 'Migration Action'],
    [
        ['Auto-increment', 'AUTO_INCREMENT', 'INTEGER PRIMARY KEY AUTOINCREMENT', 'Rewrite CREATE TABLE'],
        ['Boolean type', 'BOOLEAN (TINYINT(1))', 'INTEGER (0/1)', 'No change needed'],
        ['DATETIME', 'DATETIME, TIMESTAMP', 'TEXT (ISO 8601 string)', 'Use strftime() or store TEXT'],
        ['ENUM', 'ENUM("a","b")', 'TEXT with CHECK constraint', 'Rewrite as TEXT + CHECK'],
        ['UNSIGNED', 'UNSIGNED INT', 'Not supported', 'Remove UNSIGNED keyword'],
        ['LIMIT offset', 'LIMIT 10 OFFSET 5', 'LIMIT 5, 10 (comma syntax)', 'Swap order'],
        ['CONCAT', 'CONCAT(a, b)', 'a || b (pipe operator)', 'Replace function calls'],
        ['NOW()', 'NOW()', 'datetime("now")', 'Replace function calls'],
        ['IF()', 'IF(cond, a, b)', 'CASE WHEN cond THEN a ELSE b END', 'Rewrite conditionals'],
        ['GROUP_CONCAT', 'GROUP_CONCAT(col)', 'GROUP_CONCAT(col, separator)', 'Add separator param'],
        ['Foreign keys', 'Enabled by default', 'Must PRAGMA enable', 'Add PRAGMA statement'],
        ['JSON', 'JSON column type', 'JSON1 extension (built-in)', 'Test compatibility'],
    ],
    [0.14, 0.20, 0.24, 0.25],
))
story.append(Paragraph('Table 3: MySQL to LibSQL Syntax Differences', s_caption))
story.extend(spacer(6))

story.extend(h2('3.3 Install Turso CLI and Create Database'))
story.extend(body(
    'The Turso CLI is the primary tool for managing your databases, replicas, and authentication tokens. Install it using the commands below for your operating system. After installation, authenticate with your Turso account (create one at turbo.so if you have not already), then create your database and generate the auth token needed for connections.'
))

story.extend(spacer(4))
story.extend(code('# Install Turso CLI (macOS / Linux)'))
story.extend(code('curl -sSfL https://get.tur.so/install.sh | bash'))
story.extend(code(''))
story.extend(code('# Install Turso CLI (Windows via PowerShell)'))
story.extend(code('irm https://get.tur.so/install.ps1 | iex'))
story.extend(code(''))
story.extend(code('# Authenticate with Turso'))
story.extend(code('turso auth login'))
story.extend(code(''))
story.extend(code('# Create a new database'))
story.extend(code('turso db create [YOUR_DB_NAME] --region eu-west-1'))
story.extend(code(''))
story.extend(code('# Get the database URL'))
story.extend(code('turso db show [YOUR_DB_NAME] --url'))
story.extend(code('# Output: libsql://[YOUR_DB_NAME]-[YOUR_ORG].turso.io'))
story.extend(code(''))
story.extend(code('# Generate an auth token'))
story.extend(code('turso db tokens create [YOUR_DB_NAME]'))
story.extend(code('# Output: a long token string - SAVE THIS SECURELY'))
story.extend(code(''))
story.extend(code('# Create a replica in another region (optional)'))
story.extend(code('turso db replicas create [YOUR_DB_NAME] --region us-east-1'))
story.extend(spacer(4))

story.extend(h2('3.4 Schema and Data Migration Strategy'))
story.extend(body(
    'The recommended approach for migrating your MySQL schema and data to Turso is a three-step process: first, export your MySQL schema; second, convert the syntax to SQLite-compatible DDL; third, export and import the data. For small to medium databases (under 100MB), you can use <font name="DejaVuMono" size="8.5">mysqldump</font> for export and a conversion script for import. For larger databases, consider using a dedicated migration tool or writing a PHP script that reads from MySQL and writes to Turso.'
))
story.extend(body(
    'Start by exporting your MySQL schema and data. Then convert the MySQL DDL to SQLite-compatible syntax using the mapping table above. The most common conversion is replacing <font name="DejaVuMono" size="8.5">AUTO_INCREMENT</font> with <font name="DejaVuMono" size="8.5">AUTOINCREMENT</font> and removing <font name="DejaVuMono" size="8.5">UNSIGNED</font> keywords. After conversion, use the Turso CLI to import the schema directly into your database.'
))

story.extend(spacer(4))
story.extend(code('# Step 1: Export MySQL schema (no data, structure only)'))
story.extend(code('mysqldump -u root --no-data mydatabase > schema.sql'))
story.extend(code(''))
story.extend(code('# Step 2: Export MySQL data (CSV format)'))
story.extend(code('mysqldump -u root --tab=/tmp/export --fields-terminated-by="," \\'))
story.extend(code('  --fields-enclosed-by=\'"\' --lines-terminated-by="\\n" mydatabase'))
story.extend(code(''))
story.extend(code('# Step 3: Convert schema.sql (manual edit required)'))
story.extend(code('# - Replace AUTO_INCREMENT with AUTOINCREMENT'))
story.extend(code('# - Remove UNSIGNED keywords'))
story.extend(code('# - Replace ENUM with TEXT'))
story.extend(code('# - Replace DATETIME with TEXT'))
story.extend(code('# - Remove ENGINE=InnoDB DEFAULT CHARSET lines'))
story.extend(code('# - Add: PRAGMA foreign_keys = ON; at the top'))
story.extend(code(''))
story.extend(code('# Step 4: Import schema into Turso'))
story.extend(code('turso db shell [YOUR_DB_NAME] < schema_converted.sql'))
story.extend(code(''))
story.extend(code('# Step 5: Import data (use turso db shell with .import)'))
story.extend(code('turso db shell [YOUR_DB_NAME]'))
story.extend(code('.mode csv'))
story.extend(code('.import /tmp/export/users.csv users'))
story.extend(code('.import /tmp/export/products.csv products'))
story.extend(spacer(4))

story.extend(warning(
    'LibSQL does not support MySQL-specific features like stored procedures, triggers (with MySQL syntax), views (partially), and full-text search with MySQL syntax. If your application relies on these features, they must be reimplemented in application code or using LibSQL-compatible alternatives.'
))

# ════════════════════════════════════════════════════════
# STAGE 4: REFACTORING PHP DATABASE LAYER
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 4: Refactoring PHP Database Layer'))
story.extend(body(
    'This is the most code-intensive stage of the migration. Every database interaction in your PHP application must be rewritten from MySQL PDO/MySQLi to use the Turso PHP SDK (libsql-client). This involves replacing the connection logic, rewriting prepared statements, and ensuring all queries use SQLite-compatible syntax. The good news is that the Turso PHP SDK provides a clean, modern API that is actually simpler than PDO for most use cases.'
))

story.extend(h2('4.1 Install Turso PHP SDK'))
story.extend(body(
    'The official Turso PHP SDK (<font name="DejaVuMono" size="8.5">libsql-php</font>) provides a native PHP client for connecting to Turso databases over HTTP. It supports both local SQLite files and remote Turso databases. Install it via Composer in your project root. If you do not have Composer installed, download it from getcomposer.org.'
))

story.extend(spacer(4))
story.extend(code('# Install Turso PHP SDK via Composer'))
story.extend(code('composer require turso/libsql-client'))
story.extend(spacer(4))

story.extend(h2('4.2 Before and After: Database Connection'))
story.extend(body(
    'The following comparison shows a typical MySQL PDO connection and its Turso equivalent. The key differences are: the Turso SDK uses a URL and auth token instead of host/port/username/password, the connection is established over HTTP (no persistent TCP connection), and the client object is used directly for queries instead of a PDO instance.'
))

story.extend(spacer(4))
story.extend(code('// ===== BEFORE: MySQL PDO Connection ====='))
story.extend(code('$host = "localhost";'))
story.extend(code('$dbname = "mydatabase";'))
story.extend(code('$user = "root";'))
story.extend(code('$pass = "";'))
story.extend(code(''))
story.extend(code('$pdo = new PDO("mysql:host=$host;dbname=$dbname", $user, $pass);'))
story.extend(code('$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);'))
story.extend(spacer(4))
story.extend(code('// ===== AFTER: Turso LibSQL Connection ====='))
story.extend(code('use Turso\\LibSQL\\Client;'))
story.extend(code(''))
story.extend(code('$url  = getenv("TURSO_DB_URL");'))
story.extend(code('$token = getenv("TURSO_AUTH_TOKEN");'))
story.extend(code(''))
story.extend(code('$db = Client::withUrl($url, $token);'))
story.extend(spacer(4))

story.extend(h2('4.3 Before and After: Prepared Statements'))
story.extend(body(
    'Prepared statements are the primary defense against SQL injection. The Turso SDK supports parameterized queries with named parameters. The syntax differs from PDO but achieves the same result. Note that LibSQL uses positional parameters (<font name="DejaVuMono" size="8.5">?1, ?2</font>) instead of PDO\'s named parameters.'
))

story.extend(spacer(4))
story.extend(code('// ===== BEFORE: MySQL PDO Prepared Statement ====='))
story.extend(code('$stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email"));'))
story.extend(code('$stmt->execute([":email" => $email]);'))
story.extend(code('$user = $stmt->fetch(PDO::FETCH_ASSOC);'))
story.extend(spacer(4))
story.extend(code('// ===== AFTER: Turso LibSQL Prepared Statement ====='))
story.extend(code('$result = $db->execute("SELECT * FROM users WHERE email = ?1", [$email]);'))
story.extend(code('$rows = $result->rows;'))
story.extend(code('$user = $rows[0] ?? null;'))
story.extend(spacer(4))

story.extend(h2('4.4 Environment-Aware Configuration File'))
story.extend(body(
    'Create a centralized database configuration file that reads connection parameters from environment variables. This file will be included by every PHP script that needs database access. The configuration should automatically detect the environment (local vs production) and use the appropriate settings. Create this file at <font name="DejaVuMono" size="8.5">config/database.php</font> in your project.'
))

story.extend(spacer(4))
story.extend(code('&lt;?php // config/database.php'))
story.extend(code('require_once __DIR__ . "/../vendor/autoload.php";'))
story.extend(code('use Turso\\LibSQL\\Client;'))
story.extend(code(''))
story.extend(code('function getDb(): Turso\\LibSQL\\Client {'))
story.extend(code('    $url  = getenv("TURSO_DB_URL");'))
story.extend(code('    $token = getenv("TURSO_AUTH_TOKEN");'))
story.extend(code(''))
story.extend(code('    if (!$url || !$token) {'))
story.extend(code('        throw new RuntimeException("Missing Turso DB credentials");'))
story.extend(code('    }'))
story.extend(code('    return Client::withUrl($url, $token);'))
story.extend(code('}'))
story.extend(code('?&gt;'))
story.extend(spacer(4))

story.extend(h2('4.5 Common Query Pattern Migrations'))
story.extend(body(
    'Beyond basic SELECT queries, you will need to convert INSERT, UPDATE, DELETE, and transaction operations. The Turso SDK handles all of these through the same <font name="DejaVuMono" size="8.5">execute()</font> method. For transactions, use the <font name="DejaVuMono" size="8.5">transaction()</font> method on the client. Here are the most common patterns you will encounter during the migration.'
))

story.extend(spacer(4))
story.extend(code('// INSERT'))
story.extend(code('$db->execute("INSERT INTO users (name, email) VALUES (?1, ?2)", ['))
story.extend(code('    $name, $email'))
story.extend(code(']);'))
story.extend(code('$lastId = $db->execute("SELECT last_insert_rowid()")->rows[0][0];'))
story.extend(code(''))
story.extend(code('// UPDATE'))
story.extend(code('$db->execute("UPDATE users SET name = ?1 WHERE id = ?2", ['))
story.extend(code('    $name, $userId'))
story.extend(code(']);'))
story.extend(code(''))
story.extend(code('// DELETE'))
story.extend(code('$db->execute("DELETE FROM users WHERE id = ?1", [$userId]);'))
story.extend(code(''))
story.extend(code('// TRANSACTION'))
story.extend(code('$db->transaction(function ($db) use ($data) {'))
story.extend(code('    $db->execute("INSERT INTO orders (user_id, total) VALUES (?1, ?2)", ['))
story.extend(code('        $data["user_id"], $data["total"]'))
story.extend(code('    ]);'))
story.extend(code('    $db->execute("UPDATE inventory SET stock = stock - ?1 WHERE product_id = ?2", ['))
story.extend(code('        $data["quantity"], $data["product_id"]'))
story.extend(code('    ]);'))
story.extend(code('});'))
story.extend(spacer(4))

# ════════════════════════════════════════════════════════
# STAGE 5: PREPARING PHP FOR VERCEL
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 5: Preparing PHP for Vercel'))
story.extend(body(
    'With the database layer refactored, the next step is to configure your project for Vercel\'s deployment model. This involves creating the <font name="DejaVuMono" size="8.5">vercel.json</font> configuration file, organizing your public assets, and setting up routing rules that map URL patterns to the correct PHP files. Vercel treats each PHP file as a serverless function, so your application\'s routing architecture must be designed with this constraint in mind.'
))

story.extend(h2('5.1 How Vercel Handles PHP'))
story.extend(body(
    'When Vercel deploys a PHP project, it uses the <font name="DejaVuMono" size="8.5">@vercel/php</font> builder (specified in the build configuration). This builder scans your project for PHP files and creates a serverless function for each one. Files in the <font name="DejaVuMono" size="8.5">api/</font> directory are automatically treated as API endpoints. Files in the <font name="DejaVuMono" size="8.5">public/</font> directory are served as static assets (images, CSS, JavaScript). PHP files in <font name="DejaVuMono" size="8.5">public/</font> are also executed but with different routing behavior.'
))
story.extend(body(
    'The execution model is fundamentally different from traditional PHP hosting. On XAMPP, Apache receives a request for <font name="DejaVuMono" size="8.5">/about.php</font> and executes it directly. On Vercel, the same request hits a serverless function that boots a PHP runtime, executes the file, and returns the response. This means each request has a cold-start penalty (typically 200-500ms for PHP on Vercel), and there is no shared state between requests. Environment variables, sessions, and temporary data must be handled externally.'
))

story.extend(h2('5.2 Required vercel.json Configuration'))
story.extend(body(
    'The <font name="DejaVuMono" size="8.5">vercel.json</font> file is the central configuration for your Vercel deployment. It defines the build settings, routing rules, and headers. The following configuration covers the most common patterns for a PHP application. Place this file in your project root directory.'
))

story.extend(spacer(4))
story.extend(code('{'))
story.extend(code('  "builds": ['))
story.extend(code('    { "src": "api/**/*.php", "use": "@vercel/php" },'))
story.extend(code('    { "src": "public/**/*.php", "use": "@vercel/php" }'))
story.extend(code('  ],'))
story.extend(code('  "routes": ['))
story.extend(code('    { "src": "/api/(.*)", "dest": "/api/$1" },'))
story.extend(code('    { "src": "/(.*)", "dest": "/public/$1" },'))
story.extend(code('    { "handle": "filesystem" },'))
story.extend(code('    { "src": "/(.*)", "dest": "/public/index.php" }'))
story.extend(code('  ],'))
story.extend(code('  "headers": ['))
story.extend(code('    {'))
story.extend(code('      "source": "/api/(.*)",'))
story.extend(code('      "headers": ['))
story.extend(code('        { "key": "Access-Control-Allow-Origin", "value": "*" },'))
story.extend(code('        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },'))
story.extend(code('        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }'))
story.extend(code('      ]'))
story.extend(code('    }'))
story.extend(code('  ]'))
story.extend(code('}'))
story.extend(spacer(4))

story.extend(h2('5.3 Folder Structure for Vercel'))
story.extend(body(
    'Vercel expects a specific folder structure. The <font name="DejaVuMono" size="8.5">api/</font> directory is reserved for serverless API endpoints. The <font name="DejaVuMono" size="8.5">public/</font> directory contains static assets and serves as the document root. PHP files in <font name="DejaVuMono" size="8.5">public/</font> are executed as serverless functions when accessed via their URL path. Shared include files and configuration should live outside both directories to prevent direct HTTP access.'
))

story.extend(spacer(4))
story.extend(code('project-root/'))
story.extend(code('  |-- api/                 # API endpoints: /api/users.php'))
story.extend(code('  |     |-- users.php      # -> https://yourdomain.com/api/users'))
story.extend(code('  |     |-- products.php'))
story.extend(code('  |     |-- auth/'))
story.extend(code('  |           |-- login.php'))
story.extend(code('  |-- public/              # Document root (static + executable)'))
story.extend(code('  |     |-- index.php      # -> https://yourdomain.com/'))
story.extend(code('  |     |-- about.php      # -> https://yourdomain.com/about'))
story.extend(code('  |     |-- css/style.css  # Static file'))
story.extend(code('  |     |-- js/app.js      # Static file'))
story.extend(code('  |     |-- images/        # Static files'))
story.extend(code('  |-- config/              # NOT accessible via HTTP'))
story.extend(code('  |-- includes/            # NOT accessible via HTTP'))
story.extend(code('  |-- vendor/              # Composer dependencies'))
story.extend(code('  |-- vercel.json'))
story.extend(code('  |-- composer.json'))
story.extend(spacer(4))

story.extend(h2('5.4 Routing Adjustments'))
story.extend(body(
    'If your application uses direct <font name="DejaVuMono" size="8.5">.php</font> file references in URLs (e.g., <font name="DejaVuMono" size="8.5">/about.php</font>, <font name="DejaVuMono" size="8.5">/contact.php</font>), these will continue to work if the files are in the <font name="DejaVuMono" size="8.5">public/</font> directory. However, for cleaner URLs (e.g., <font name="DejaVuMono" size="8.5">/about</font>, <font name="DejaVuMono" size="8.5">/contact</font>), add rewrite rules to <font name="DejaVuMono" size="8.5">vercel.json</font>. The routing system in Vercel processes rules in order, so more specific patterns should come before general catch-all patterns.'
))

story.extend(spacer(4))
story.extend(code('// Add these to "routes" array in vercel.json:'))
story.extend(code('{ "src": "/about", "dest": "/public/about.php" },'))
story.extend(code('{ "src": "/contact", "dest": "/public/contact.php" },'))
story.extend(code('{ "src": "/login", "dest": "/public/login.php" },'))
story.extend(code('{ "src": "/dashboard/(.*)", "dest": "/public/dashboard.php?page=$1" },'))
story.extend(spacer(4))


# ════════════════════════════════════════════════════════
# STAGE 6: DEPLOYING TO VERCEL
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 6: Deploying to Vercel'))
story.extend(body(
    'With your project prepared, configured, and pushed to GitHub, you are ready to deploy to Vercel. This stage covers the complete deployment process including GitHub integration, environment variable configuration, build settings, and production deployment. The entire process can be completed in under 15 minutes using the Vercel dashboard.'
))

story.extend(h2('6.1 Vercel Dashboard Deployment Steps'))
story.extend(body(
    'Follow these steps to deploy your PHP project on Vercel. The process connects your GitHub repository to Vercel, which enables automatic deployments on every push to the main branch. This CI/CD integration is one of Vercel\'s strongest features and eliminates the need for manual deployment workflows.'
))

story.extend(spacer(4))
story.extend(code('Step-by-step Vercel deployment:'))
story.extend(code(''))
story.extend(code('1. Go to https://vercel.com/new'))
story.extend(code('2. Sign in with your GitHub account'))
story.extend(code('3. Select [YOUR_GITHUB_REPO] from the repository list'))
story.extend(code('4. Configure the project:'))
story.extend(code('   - Framework Preset: "Other"'))
story.extend(code('   - Root Directory: "." (project root)'))
story.extend(code('   - Build Command: (leave empty - auto-detected)'))
story.extend(code('   - Output Directory: (leave empty)'))
story.extend(code('5. Click "Deploy"'))
story.extend(code('6. Wait for build to complete (2-5 minutes for first build)'))
story.extend(code('7. Vercel assigns a preview URL: https://yourproject.vercel.app'))
story.extend(spacer(4))

story.extend(h2('6.2 Environment Variable Setup'))
story.extend(body(
    'After the initial deployment, configure the environment variables that your application needs. Navigate to your project\'s Settings tab in the Vercel dashboard, select Environment Variables, and add the following variables. These variables are accessible in your PHP code via <font name="DejaVuMono" size="8.5">getenv()</font> and are encrypted at rest.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Variable', 'Example Value', 'Description', 'Required'],
    [
        ['TURSO_DB_URL', 'libsql://mydb-myorg.turso.io', 'Turso database connection URL', 'Yes'],
        ['TURSO_AUTH_TOKEN', 'eyJhbGciOiJIUzI1NiIsIn...', 'Turso authentication token', 'Yes'],
        ['APP_ENV', 'production', 'Application environment', 'Yes'],
        ['APP_URL', 'https://yourdomain.com', 'Base URL for dynamic links', 'Yes'],
        ['APP_KEY', 'base64:random32chars...', 'Encryption key for sessions', 'Yes'],
    ],
    [0.20, 0.30, 0.32, 0.10],
))
story.append(Paragraph('Table 4: Required Vercel Environment Variables', s_caption))
story.extend(spacer(6))

story.extend(note(
    'Environment variables can be scoped to specific environments (Production, Preview, Development). Use this feature to have different Turso databases for testing and production, which prevents accidental data corruption during development.'
))

story.extend(h2('6.3 Custom Domain Setup'))
story.extend(body(
    'By default, Vercel provides a <font name="DejaVuMono" size="8.5">.vercel.app</font> subdomain. For production use, add a custom domain. Navigate to Settings then Domains in the Vercel dashboard. Enter your domain name (e.g., <font name="DejaVuMono" size="8.5">app.yourdomain.com</font>) and follow the DNS configuration instructions. Vercel automatically provisions an SSL certificate via Let\'s Encrypt, so HTTPS is handled without any additional configuration on your part.'
))
story.extend(body(
    'For the DNS configuration, add a CNAME record pointing your subdomain to <font name="DejaVuMono" size="8.5">cname.vercel-dns.com</font>. If you are using a root domain (e.g., <font name="DejaVuMono" size="8.5">yourdomain.com</font>), use A records pointing to <font name="DejaVuMono" size="8.5">76.76.21.21</font>. DNS propagation typically takes 5-30 minutes. Vercel will automatically issue the SSL certificate once DNS is verified.'
))

# ════════════════════════════════════════════════════════
# STAGE 7: HANDLING HARDCODED URLS & PATHS
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 7: Handling Hardcoded Localhost URLs and Paths'))
story.extend(body(
    'One of the most common issues when migrating from a local XAMPP setup to a production deployment is hardcoded localhost URLs and absolute Windows paths. These references break immediately when the application runs on Vercel. This stage shows you how to systematically find and replace all hardcoded references with environment-aware dynamic values.'
))

story.extend(h2('7.1 Dynamic Base URL Configuration'))
story.extend(body(
    'Create a helper function that returns the correct base URL based on the current environment. This function should be used everywhere in your application instead of hardcoded URLs. It reads the <font name="DejaVuMono" size="8.5">APP_URL</font> environment variable (set in Vercel) and falls back to localhost for local development. Create this file at <font name="DejaVuMono" size="8.5">config/app.php</font>.'
))

story.extend(spacer(4))
story.extend(code('&lt;?php // config/app.php'))
story.extend(code('function base_url(string $path = ""): string {'))
story.extend(code('    $baseUrl = getenv("APP_URL") ?: "http://localhost";'))
story.extend(code('    return rtrim($baseUrl, "/") . "/" . ltrim($path, "/");'))
story.extend(code('}'))
story.extend(code(''))
story.extend(code('function asset_url(string $path): string {'))
story.extend(code('    return base_url($path);'))
story.extend(code('}'))
story.extend(code(''))
story.extend(code('function redirect(string $path): void {'))
story.extend(code('    header("Location: " . base_url($path));'))
story.extend(code('    exit;'))
story.extend(code('}'))
story.extend(code('?&gt;'))
story.extend(spacer(4))

story.extend(h2('7.2 Before and After: Common Hardcoded Patterns'))
story.extend(body(
    'Below are the most common hardcoded patterns found in XAMPP PHP projects and their corrected versions using the dynamic configuration. Search your entire codebase for these patterns and replace them systematically.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Pattern', 'Before (Hardcoded)', 'After (Dynamic)'],
    [
        ['Form action', '&lt;form action="http://localhost/project/contact.php"&gt;', '&lt;form action="&lt;?= base_url("contact") ?&gt;"&gt;'],
        ['Link href', '&lt;a href="http://localhost/project/about.php"&gt;', '&lt;a href="&lt;?= base_url("about") ?&gt;"&gt;'],
        ['Image src', '&lt;img src="/images/logo.png"&gt;', '&lt;img src="&lt;?= asset_url("images/logo.png") ?&gt;"&gt;'],
        ['Include path', 'require "C:/xampp/htdocs/project/includes/header.php"', 'require __DIR__ . "/../includes/header.php"'],
        ['API endpoint', 'fetch("http://localhost/project/api/users")', 'fetch(base_url + "/api/users")'],
        ['Header redirect', 'header("Location: /project/dashboard.php")', 'redirect("dashboard")'],
        ['CSS link', '&lt;link href="css/style.css"&gt;', '&lt;link href="&lt;?= asset_url("css/style.css") ?&gt;"&gt;'],
    ],
    [0.15, 0.40, 0.45],
))
story.append(Paragraph('Table 5: Hardcoded Pattern Replacement Guide', s_caption))
story.extend(spacer(6))

story.extend(h2('7.3 Bulk Search and Replace Script'))
story.extend(body(
    'Use this shell script to identify all files containing hardcoded localhost references. Run this from your project root. Review each file manually before making changes, as some references (like documentation or comments) may not need modification. The script generates a report file listing every occurrence with file path and line number.'
))

story.extend(spacer(4))
story.extend(code('# Search for hardcoded localhost URLs'))
story.extend(code('echo "=== Hardcoded localhost URLs ===" > migration_audit.txt'))
story.extend(code('grep -rn "localhost" --include="*.php" . >> migration_audit.txt'))
story.extend(code('grep -rn "127\\.0\\.0\\.1" --include="*.php" . >> migration_audit.txt'))
story.extend(code(''))
story.extend(code('# Search for absolute Windows/XAMPP paths'))
story.extend(code('echo "\\n=== Absolute Windows paths ===" >> migration_audit.txt'))
story.extend(code('grep -rn "C:/xampp" --include="*.php" . >> migration_audit.txt'))
story.extend(code('grep -rn "C:\\\\xampp" --include="*.php" . >> migration_audit.txt'))
story.extend(code(''))
story.extend(code('# Search for hardcoded .php extensions in URLs'))
story.extend(code('echo "\\n=== Hardcoded .php URL references ===" >> migration_audit.txt'))
story.extend(code('grep -rn \'href=".*\\.php"\' --include="*.php" . >> migration_audit.txt'))
story.extend(code('grep -rn \'action=".*\\.php"\' --include="*.php" . >> migration_audit.txt'))
story.extend(code(''))
story.extend(code('# View the audit report'))
story.extend(code('cat migration_audit.txt'))
story.extend(spacer(4))


# ════════════════════════════════════════════════════════
# STAGE 8: SSL, ENVIRONMENT SECURITY & PRODUCTION HARDENING
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 8: SSL, Environment Security, and Production Hardening'))
story.extend(body(
    'Security is not an afterthought; it is a continuous process. This stage covers the security measures you must implement for your production deployment on Vercel. Vercel handles some security concerns automatically (SSL, DDoS protection), but application-level security remains your responsibility. The following checklist ensures your application meets production security standards.'
))

story.extend(h2('8.1 HTTPS and SSL'))
story.extend(body(
    'Vercel automatically provisions SSL certificates via Let\'s Encrypt for all deployments, including custom domains. HTTPS is enforced by default and HTTP requests are automatically redirected to HTTPS. You do not need to configure anything for SSL. However, ensure that all hardcoded URLs in your application use <font name="DejaVuMono" size="8.5">https://</font> (handled by the <font name="DejaVuMono" size="8.5">APP_URL</font> environment variable from Stage 7), and that mixed content warnings are avoided by using protocol-relative URLs or the dynamic base URL function.'
))

story.extend(h2('8.2 Secure Headers'))
story.extend(body(
    'Add security headers to all responses. Vercel allows you to configure headers globally in the <font name="DejaVuMono" size="8.5">vercel.json</font> file. The following headers provide protection against common web vulnerabilities including clickjacking, MIME-type sniffing, and cross-site scripting. Add these to the <font name="DejaVuMono" size="8.5">headers</font> array in your <font name="DejaVuMono" size="8.5">vercel.json</font>.'
))

story.extend(spacer(4))
story.extend(code('// Add to "headers" array in vercel.json:'))
story.extend(code('{'))
story.extend(code('  "source": "/(.*)",'))
story.extend(code('  "headers": ['))
story.extend(code('    { "key": "X-Content-Type-Options", "value": "nosniff" },'))
story.extend(code('    { "key": "X-Frame-Options", "value": "DENY" },'))
story.extend(code('    { "key": "X-XSS-Protection", "value": "1; mode=block" },'))
story.extend(code('    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },'))
story.extend(code('    { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }'))
story.extend(code('  ]'))
story.extend(code('}'))
story.extend(spacer(4))

story.extend(h2('8.3 Hiding PHP Errors in Production'))
story.extend(body(
    'PHP error messages contain sensitive information about your application\'s file structure, database queries, and server configuration. In production, all errors should be logged to a file or external service rather than displayed to users. Configure error reporting at the top of your main entry point file (e.g., <font name="DejaVuMono" size="8.5">public/index.php</font>) or in a shared header file.'
))

story.extend(spacer(4))
story.extend(code('&lt;?php // Add at top of public/index.php or includes/headers.php'))
story.extend(code('// Disable error display in production'))
story.extend(code('if (getenv("APP_ENV") === "production") {'))
story.extend(code('    ini_set("display_errors", "0");'))
story.extend(code('    ini_set("log_errors", "1");'))
story.extend(code('    error_reporting(E_ALL);'))
story.extend(code('    // Log to stderr (captured by Vercel)'))
story.extend(code('    ini_set("error_log", "php://stderr");'))
story.extend(code('} else {'))
story.extend(code('    ini_set("display_errors", "1");'))
story.extend(code('    error_reporting(E_ALL);'))
story.extend(code('}'))
story.extend(code('?&gt;'))
story.extend(spacer(4))

story.extend(h2('8.4 Secrets Management'))
story.extend(body(
    'Never commit secrets (API keys, database tokens, encryption keys) to your Git repository. Vercel\'s environment variables are encrypted at rest and injected at build time, making them the recommended way to store secrets. For additional security, use Vercel\'s Edge Config for secrets that need to change without redeployment. Rotate your Turso auth token periodically (every 90 days is recommended) and update the environment variable in the Vercel dashboard.'
))

story.extend(warning(
    'If you accidentally commit secrets to GitHub, they remain in your Git history even after deletion. Use the GitHub Secret Scanning feature or tools like <font name="DejaVuMono" size="8.5">git-filter-repo</font> to remove sensitive data from your repository history. Rotate all compromised credentials immediately.'
))


# ════════════════════════════════════════════════════════
# STAGE 9: POST-DEPLOYMENT TESTING
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 9: Post-Deployment Testing'))
story.extend(body(
    'After deploying to Vercel, you must verify that every feature of your application works correctly in the production environment. Testing a serverless PHP application requires a different approach than testing a traditional XAMPP setup, because each request is independent, the filesystem is ephemeral, and environment variables are the sole configuration mechanism.'
))

story.extend(h2('9.1 Testing Checklist'))
story.extend(body(
    'Work through this checklist systematically after each deployment. Each item tests a specific aspect of your application\'s functionality in the Vercel serverless environment. Check every item and document any failures for debugging.'
))

story.extend(spacer(6))
story.append(make_table(
    ['#', 'Test Case', 'Expected Result', 'How to Test'],
    [
        ['1', 'Homepage loads', '200 OK, full HTML rendered', 'Visit root URL in browser'],
        ['2', 'All pages load', '200 OK for each page', 'Test every .php page link'],
        ['3', 'API endpoints respond', 'JSON response, correct data', 'Use curl or Postman'],
        ['4', 'Database reads work', 'Correct data from Turso', 'Browse data-heavy pages'],
        ['5', 'Database writes work', 'Data persisted to Turso', 'Submit a form, verify in DB'],
        ['6', 'Environment variables', 'Config values loaded', 'Add ?debug=1 to URL, print env'],
        ['7', 'HTTPS redirect', 'HTTP redirects to HTTPS', 'Visit http:// version'],
        ['8', 'Static assets load', 'CSS/JS/images 200 OK', 'Check browser Network tab'],
        ['9', 'Custom domain resolves', 'SSL cert valid, page loads', 'Visit custom domain'],
        ['10', 'Error pages display', 'Custom 404/500 pages', 'Visit non-existent URL'],
        ['11', 'Cold start latency', 'Page loads in under 3s', 'Clear cache, test first load'],
        ['12', 'CORS headers present', 'API responds to cross-origin', 'Test from different origin'],
    ],
    [0.05, 0.20, 0.28, 0.32],
))
story.append(Paragraph('Table 6: Post-Deployment Testing Checklist', s_caption))
story.extend(spacer(6))

story.extend(h2('9.2 Database Connectivity Check'))
story.extend(body(
    'Create a temporary diagnostic endpoint to verify Turso connectivity from Vercel. This file should be removed after testing. It attempts to connect to Turso, run a simple query, and returns the result as JSON. If this returns an error, your Turso credentials or network configuration are incorrect.'
))

story.extend(spacer(4))
story.extend(code('&lt;?php // api/health.php (REMOVE after testing)'))
story.extend(code('header("Content-Type: application/json");'))
story.extend(code('require_once __DIR__ . "/../config/database.php";'))
story.extend(code('try {'))
story.extend(code('    $db = getDb();'))
story.extend(code('    $result = $db->execute("SELECT 1 as test");'))
story.extend(code('    echo json_encode(["status" => "ok", "db" => "connected"]);'))
story.extend(code('} catch (Exception $e) {'))
story.extend(code('    http_response_code(500);'))
story.extend(code('    echo json_encode(["status" => "error", "message" => $e->getMessage()]);'))
story.extend(code('}'))
story.extend(code('?&gt;'))
story.extend(spacer(4))

story.extend(h2('9.3 Debugging Strategy'))
story.extend(body(
    'When something goes wrong in production, use Vercel\'s built-in debugging tools. The Vercel dashboard provides real-time logs for every deployment. Navigate to your project\'s Logs tab to see output from <font name="DejaVuMono" size="8.5">error_log()</font>, <font name="DejaVuMono" size="8.5">echo</font>, and <font name="DejaVuMono" size="8.5">var_dump()</font> statements. For more detailed debugging, use the Vercel CLI (<font name="DejaVuMono" size="8.5">npm i -g vercel</font>) and run <font name="DejaVuMono" size="8.5">vercel logs [deployment-url]</font> to stream logs in real-time from your terminal.'
))
story.extend(body(
    'Common issues to check: missing environment variables (the most common cause of 500 errors), Turso auth token expiration or invalidation, incompatible SQL syntax that works in MySQL but fails in LibSQL, and cold start timeouts for complex PHP files that include many dependencies. For cold start issues, consider combining multiple PHP files into fewer, larger serverless functions to reduce the number of cold starts per page load.'
))

story.extend(h2('9.4 Performance Checks'))
story.extend(body(
    'Monitor your application\'s performance after deployment using Vercel\'s Analytics (available on Pro plans) or external tools like Google PageSpeed Insights, GTmetrix, and WebPageTest. Key metrics to watch include Time to First Byte (TTFB), which should be under 500ms for serverless PHP; First Contentful Paint (FCP), which should be under 1.8 seconds; and Total Blocking Time (TBT), which should be under 200ms. If TTFB is consistently above 1 second, consider upgrading your Vercel plan (which provides more memory and CPU for serverless functions) or optimizing your PHP code to reduce bootstrap time.'
))


# ════════════════════════════════════════════════════════
# STAGE 10: TROUBLESHOOTING TABLE
# ════════════════════════════════════════════════════════
story.extend(h1('Stage 10: Troubleshooting Reference'))
story.extend(body(
    'This table covers the most common errors encountered during PHP to Vercel migration with Turso, their root causes, and step-by-step fixes. Use this as your first reference when something goes wrong. Each entry has been compiled from real-world migration scenarios.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Error', 'Likely Cause', 'Fix'],
    [
        ['500 Internal Server Error on all pages', 'Missing TURSO_DB_URL or TURSO_AUTH_TOKEN env var', 'Add both variables in Vercel Settings then redeploy'],
        ['500 Error on specific PHP page', 'PHP syntax error or fatal exception in that file', 'Check Vercel Logs for stack trace; fix the error and push'],
        ['Turso "authentication failed"', 'Invalid or expired auth token', 'Generate new token: turso db tokens create [DB_NAME]'],
        ['Turso "database not found"', 'Wrong database URL or database was deleted', 'Verify URL with: turso db show [DB_NAME] --url'],
        ['Page not found (404)', 'File not in public/ or route not in vercel.json', 'Move file to public/ or add route rewrite rule'],
        ['Static assets return 404', 'Assets not in public/ directory', 'Move CSS/JS/images to public/ directory'],
        ['PHP session not persisting', 'Vercel filesystem is ephemeral', 'Use Upstash Redis or external session storage'],
        ['File upload fails', 'No persistent filesystem on Vercel', 'Use S3, Cloudflare R2, or Uploadthing for storage'],
        ['SQL syntax error', 'MySQL-specific syntax in LibSQL query', 'Check Table 3 for syntax differences; rewrite query'],
        ['Cold start too slow (3s+)', 'Large PHP bootstrap (many includes)', 'Combine files, use autoloader, reduce dependencies'],
        ['CORS error on API call', 'Missing CORS headers in vercel.json', 'Add Access-Control headers in vercel.json headers array'],
        ['Mixed content warning', 'HTTP resource loaded on HTTPS page', 'Use asset_url() helper for all asset references'],
        ['composer install fails on Vercel', 'Missing or invalid composer.json', 'Verify composer.json is valid; test locally first'],
        ['AUTO_INCREMENT error', 'MySQL syntax used in LibSQL CREATE TABLE', 'Change to: id INTEGER PRIMARY KEY AUTOINCREMENT'],
        ['Environment variable is null', 'Variable not set in Vercel dashboard', 'Add in Settings then redeploy (env vars require redeploy)'],
    ],
    [0.28, 0.30, 0.42],
))
story.append(Paragraph('Table 7: Comprehensive Troubleshooting Reference', s_caption))
story.extend(spacer(12))


# ════════════════════════════════════════════════════════
# APPENDIX A: RECOMMENDED ARCHITECTURE
# ════════════════════════════════════════════════════════
story.extend(h1('Appendix A: Recommended Architecture for Long-Term Scalability'))
story.extend(body(
    'If you plan to scale your application beyond a simple PHP website, consider migrating to a modern architecture that separates concerns and leverages the strengths of each platform component. The recommended long-term architecture follows a decoupled frontend-backend pattern where the frontend is a static site or Single Page Application (SPA) deployed on Vercel\'s Edge Network, and the backend is a set of serverless API functions also on Vercel, communicating with Turso for data persistence.'
))
story.extend(body(
    'This architecture provides several advantages over a monolithic PHP application. First, the frontend can be cached at the edge, resulting in sub-100ms page loads globally. Second, the API layer can scale independently based on demand. Third, the Turso database handles read replicas automatically, reducing latency for users in different geographic regions. Fourth, the separation of concerns makes the codebase easier to maintain, test, and extend over time.'
))
story.extend(body(
    'For a gradual migration path, start by converting your PHP pages to API endpoints that return JSON data. Then build a lightweight frontend (using plain HTML/JS or a framework like Alpine.js or htmx for minimal complexity) that consumes those API endpoints. This approach lets you migrate incrementally without rewriting the entire application at once. Each page can be migrated independently: convert the backend to an API, then update the frontend to consume it, then move to the next page.'
))


# ════════════════════════════════════════════════════════
# APPENDIX B: PLATFORM RECOMMENDATION
# ════════════════════════════════════════════════════════
story.extend(h1('Appendix B: Platform Recommendation'))
story.extend(body(
    'Based on your current setup (raw PHP website on XAMPP with MySQL), here is the honest recommendation. The right choice depends on your project\'s specific requirements, your team\'s technical expertise, and your budget constraints. Each option below includes a clear assessment of when it is the best fit.'
))

story.extend(spacer(6))
story.append(make_table(
    ['Option', 'When to Choose', 'Pros', 'Cons'],
    [
        ['Stay: PHP on Vercel + Turso', 'API-heavy app, static frontend, edge deployment needed', 'Free tier, global CDN, automatic SSL, Git integration', 'No persistent filesystem, cold starts, PHP community runtime only'],
        ['Move: Laravel on Railway', 'Full-stack PHP app, sessions, uploads, background jobs', 'Native PHP support, persistent FS, managed DB, cron jobs', 'No edge deployment, $5+/month, smaller free tier'],
        ['Use: Traditional Hosting (Hostinger)', 'Simple PHP website, no scaling needs, budget-conscious', 'Cheapest option, cPanel, native PHP, email hosting included', 'No CI/CD, no edge, manual deployments, limited scaling'],
        ['Hybrid: Frontend on Vercel + Backend on Railway', 'Complex app needing both edge frontend and persistent backend', 'Best of both worlds, scalable, modern tooling', 'More complex setup, two platforms to manage, higher cost'],
    ],
    [0.18, 0.28, 0.27, 0.27],
))
story.append(Paragraph('Table 8: Platform Recommendation Matrix', s_caption))
story.extend(spacer(12))


# ════════════════════════════════════════════════════════
# APPENDIX C: DIFFICULTY ESTIMATE
# ════════════════════════════════════════════════════════
story.extend(h1('Appendix C: Migration Difficulty Estimate'))

story.extend(body(
    'Based on the complexity analysis of all 10 stages, the overall migration difficulty is rated as <b>Medium</b>. Here is the breakdown by stage, with estimated time for a developer familiar with PHP and basic Git usage but new to Vercel and Turso. Total estimated time is 2-4 days for a small-to-medium PHP project (under 20 pages, under 10 database tables).'
))

story.extend(spacer(6))
story.append(make_table(
    ['Stage', 'Description', 'Difficulty', 'Est. Time'],
    [
        ['1', 'Audit and Compatibility Check', 'Easy', '1-2 hours'],
        ['2', 'GitHub Preparation', 'Easy', '30-60 minutes'],
        ['3', 'Migrating MySQL to Turso', 'Medium-Hard', '3-5 hours'],
        ['4', 'Refactoring PHP Database Layer', 'Hard', '4-8 hours'],
        ['5', 'Preparing PHP for Vercel', 'Medium', '1-2 hours'],
        ['6', 'Deploying to Vercel', 'Easy', '30-60 minutes'],
        ['7', 'Handling Hardcoded URLs/Paths', 'Easy-Medium', '1-3 hours'],
        ['8', 'SSL and Security Hardening', 'Easy', '1-2 hours'],
        ['9', 'Post-Deployment Testing', 'Easy', '2-3 hours'],
        ['10', 'Troubleshooting', 'Ongoing', 'Varies'],
    ],
    [0.08, 0.42, 0.18, 0.18],
))
story.append(Paragraph('Table 9: Stage-by-Stage Difficulty and Time Estimate', s_caption))
story.extend(spacer(12))

story.extend(body(
    'The hardest stages are 3 (database migration) and 4 (PHP database refactoring), which together account for roughly 60% of the total effort. Stages 1, 2, 6, 8, and 9 are straightforward and can be completed quickly. Stage 7 (hardcoded URLs) varies widely depending on code quality: a well-structured project may need only 30 minutes, while a legacy codebase with hundreds of hardcoded references could take several hours. If your project uses a framework (even a lightweight one) rather than raw procedural PHP, the migration will be significantly easier because configuration is typically centralized.'
))

story.extend(warning(
    'This guide assumes a small-to-medium PHP project. For large applications (50+ pages, complex database schemas, session-heavy workflows, or heavy use of MySQL-specific features), the difficulty increases to Hard and the estimated time doubles to 5-10 days. Consider phasing the migration over multiple iterations rather than attempting a big-bang approach.'
))


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
from reportlab.platypus import PageTemplate, Frame
from reportlab.lib.units import inch

def footer_handler(canvas, doc):
    """Add page number footer to each page."""
    canvas.saveState()
    canvas.setFont('TimesNewRoman', 8)
    canvas.setFillColor(TEXT_MUTED)
    page_num = canvas.getPageNumber()
    text = "PHP/MySQL to Vercel + Turso Migration Guide  |  Page %d" % page_num
    canvas.drawCentredString(PAGE_W / 2, 0.5 * inch, text)
    # Draw a thin top line
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.3)
    canvas.line(LEFT_MARGIN, 0.65 * inch, PAGE_W - RIGHT_MARGIN, 0.65 * inch)
    canvas.restoreState()

frame = Frame(LEFT_MARGIN, BOTTOM_MARGIN, AVAILABLE_W, PAGE_H - TOP_MARGIN - BOTTOM_MARGIN,
              id='normal', showBoundary=0)

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=LEFT_MARGIN,
    rightMargin=RIGHT_MARGIN,
    topMargin=TOP_MARGIN,
    bottomMargin=BOTTOM_MARGIN,
    title='PHP/MySQL to Vercel + Turso Migration Guide',
    author='Z.ai',
    subject='Production-ready migration and deployment guide',
    creator='Z.ai',
)
doc.addPageTemplates([
    PageTemplate(id='content', frames=frame, onPage=footer_handler),
])

print("Building body PDF...")
doc.multiBuild(story)
print("Body PDF built: %s" % OUTPUT_PATH)
