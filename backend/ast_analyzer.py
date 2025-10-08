"""
AST Analysis Module for Code Review Enhancement
Provides comprehensive code analysis before sending to Gemini AI
"""

import ast
import re
import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import traceback

@dataclass
class ASTAnalysis:
    """Container for AST analysis results"""
    language: str
    structure: Dict[str, Any]
    complexity: Dict[str, Any]
    issues: List[str]
    metrics: Dict[str, Any]
    security_concerns: List[str]
    performance_issues: List[str]
    best_practices: List[str]
    
class CodeAnalyzer:
    """Main AST analyzer class"""
    
    def __init__(self):
        self.python_analyzer = PythonASTAnalyzer()
        self.javascript_analyzer = JavaScriptASTAnalyzer()
        self.java_analyzer = JavaASTAnalyzer()
        self.cpp_analyzer = CppASTAnalyzer()
        
    def analyze_code(self, code: str, language: str = None) -> ASTAnalysis:
        """Main entry point for code analysis"""
        try:
            # Auto-detect language if not provided
            if not language:
                language = self._detect_language(code)
            
            # Route to appropriate analyzer
            if language.lower() in ['python', 'py']:
                return self.python_analyzer.analyze(code)
            elif language.lower() in ['javascript', 'js', 'typescript', 'ts']:
                return self.javascript_analyzer.analyze(code)
            elif language.lower() in ['java']:
                return self.java_analyzer.analyze(code)
            elif language.lower() in ['c', 'cpp', 'c++']:
                return self.cpp_analyzer.analyze(code)
            else:
                return self._generic_analysis(code, language)
                
        except Exception as e:
            # Return basic analysis if AST parsing fails
            return self._fallback_analysis(code, language, str(e))
    
    def _detect_language(self, code: str) -> str:
        """Simple language detection based on code patterns"""
        code_lower = code.lower().strip()
        
        if any(keyword in code_lower for keyword in ['def ', 'import ', 'print(', 'if __name__']):
            return 'python'
        elif any(keyword in code_lower for keyword in ['function', 'const ', 'let ', 'var ', '=>']):
            return 'javascript'
        elif any(keyword in code_lower for keyword in ['public class', 'static void', 'import java']):
            return 'java'
        elif any(keyword in code_lower for keyword in ['#include', 'int main', 'printf']):
            return 'cpp'
        else:
            return 'unknown'
    
    def _generic_analysis(self, code: str, language: str) -> ASTAnalysis:
        """Generic analysis for unsupported languages"""
        lines = code.split('\n')
        
        return ASTAnalysis(
            language=language,
            structure={'lines': len(lines), 'estimated_functions': code.count('function') + code.count('def ')},
            complexity={'estimated_complexity': 'medium' if len(lines) > 50 else 'low'},
            issues=[],
            metrics={'line_count': len(lines), 'char_count': len(code)},
            security_concerns=[],
            performance_issues=[],
            best_practices=[]
        )
    
    def _fallback_analysis(self, code: str, language: str, error: str) -> ASTAnalysis:
        """Fallback analysis when AST parsing fails"""
        lines = code.split('\n')
        return ASTAnalysis(
            language=language,
            structure={'lines': len(lines), 'parse_error': error},
            complexity={'status': 'parse_failed'},
            issues=[f"AST parsing failed: {error}"],
            metrics={'line_count': len(lines)},
            security_concerns=[],
            performance_issues=[],
            best_practices=[]
        )

class PythonASTAnalyzer:
    """Python-specific AST analyzer"""
    
    def analyze(self, code: str) -> ASTAnalysis:
        """Analyze Python code using AST"""
        try:
            tree = ast.parse(code)
            
            # Extract structure
            structure = self._extract_structure(tree)
            
            # Calculate complexity
            complexity = self._calculate_complexity(tree)
            
            # Find issues
            issues = self._find_issues(tree, code)
            
            # Calculate metrics
            metrics = self._calculate_metrics(tree, code)
            
            # Security analysis
            security_concerns = self._analyze_security(tree, code)
            
            # Performance analysis
            performance_issues = self._analyze_performance(tree)
            
            # Best practices check
            best_practices = self._check_best_practices(tree, code)
            
            return ASTAnalysis(
                language='python',
                structure=structure,
                complexity=complexity,
                issues=issues,
                metrics=metrics,
                security_concerns=security_concerns,
                performance_issues=performance_issues,
                best_practices=best_practices
            )
            
        except SyntaxError as e:
            return ASTAnalysis(
                language='python',
                structure={'syntax_error': str(e)},
                complexity={'status': 'syntax_error'},
                issues=[f"Syntax Error: {e}"],
                metrics={'line_count': len(code.split('\n'))},
                security_concerns=[],
                performance_issues=[],
                best_practices=[]
            )
    
    def _extract_structure(self, tree: ast.AST) -> Dict[str, Any]:
        """Extract code structure from AST"""
        functions = []
        classes = []
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    'name': node.name,
                    'args': len(node.args.args),
                    'line': node.lineno,
                    'is_async': isinstance(node, ast.AsyncFunctionDef)
                })
            elif isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                classes.append({
                    'name': node.name,
                    'methods': methods,
                    'line': node.lineno
                })
            elif isinstance(node, (ast.Import, ast.ImportFrom)):
                if isinstance(node, ast.Import):
                    imports.extend([alias.name for alias in node.names])
                else:
                    imports.append(node.module or 'relative_import')
        
        return {
            'functions': functions,
            'classes': classes,
            'imports': imports,
            'total_functions': len(functions),
            'total_classes': len(classes),
            'total_imports': len(imports)
        }
    
    def _calculate_complexity(self, tree: ast.AST) -> Dict[str, Any]:
        """Calculate cyclomatic complexity"""
        complexity_score = 1  # Base complexity
        max_nesting = 0
        current_nesting = 0
        
        def count_complexity(node, nesting=0):
            nonlocal complexity_score, max_nesting, current_nesting
            current_nesting = max(current_nesting, nesting)
            max_nesting = max(max_nesting, nesting)
            
            # Add complexity for control flow
            if isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
                complexity_score += 1
            elif isinstance(node, ast.If) and node.orelse:
                complexity_score += 1  # elif/else
            
            # Recursively process child nodes
            for child in ast.iter_child_nodes(node):
                if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.With)):
                    count_complexity(child, nesting + 1)
                else:
                    count_complexity(child, nesting)
        
        count_complexity(tree)
        
        # Classify complexity
        if complexity_score <= 5:
            complexity_level = 'low'
        elif complexity_score <= 10:
            complexity_level = 'medium'
        else:
            complexity_level = 'high'
        
        return {
            'cyclomatic_complexity': complexity_score,
            'max_nesting_depth': max_nesting,
            'complexity_level': complexity_level
        }
    
    def _find_issues(self, tree: ast.AST, code: str) -> List[str]:
        """Find potential code issues"""
        issues = []
        
        # Check for long functions
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Estimate function length
                if hasattr(node, 'end_lineno') and node.end_lineno:
                    func_length = node.end_lineno - node.lineno
                    if func_length > 50:
                        issues.append(f"Function '{node.name}' is too long ({func_length} lines)")
                
                # Check for too many parameters
                if len(node.args.args) > 7:
                    issues.append(f"Function '{node.name}' has too many parameters ({len(node.args.args)})")
        
        # Check for unused variables (basic check)
        assigned_vars = set()
        used_vars = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        assigned_vars.add(target.id)
            elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                used_vars.add(node.id)
        
        unused_vars = assigned_vars - used_vars
        if unused_vars:
            issues.append(f"Potentially unused variables: {', '.join(list(unused_vars)[:5])}")
        
        return issues
    
    def _calculate_metrics(self, tree: ast.AST, code: str) -> Dict[str, Any]:
        """Calculate code metrics"""
        lines = code.split('\n')
        
        return {
            'total_lines': len(lines),
            'non_empty_lines': len([line for line in lines if line.strip()]),
            'comment_lines': len([line for line in lines if line.strip().startswith('#')]),
            'total_nodes': len(list(ast.walk(tree)))
        }
    
    def _analyze_security(self, tree: ast.AST, code: str) -> List[str]:
        """Basic security analysis"""
        security_issues = []
        
        # Check for dangerous functions
        dangerous_funcs = ['eval', 'exec', 'compile', '__import__']
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id in dangerous_funcs:
                    security_issues.append(f"Dangerous function '{node.func.id}' used")
        
        # Check for SQL injection patterns
        if re.search(r'["\'].*%.*["\'].*%', code):
            security_issues.append("Potential SQL injection vulnerability (string formatting)")
        
        return security_issues
    
    def _analyze_performance(self, tree: ast.AST) -> List[str]:
        """Analyze performance issues"""
        performance_issues = []
        
        # Check for nested loops
        loop_nesting = 0
        max_loop_nesting = 0
        
        def check_loops(node, depth=0):
            nonlocal loop_nesting, max_loop_nesting
            
            if isinstance(node, (ast.For, ast.While)):
                depth += 1
                max_loop_nesting = max(max_loop_nesting, depth)
                
                if depth > 2:
                    performance_issues.append(f"Deeply nested loops detected (depth: {depth})")
            
            for child in ast.iter_child_nodes(node):
                check_loops(child, depth)
        
        check_loops(tree)
        
        return performance_issues
    
    def _check_best_practices(self, tree: ast.AST, code: str) -> List[str]:
        """Check coding best practices"""
        suggestions = []
        
        # Check naming conventions
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if not node.name.islower() or '__' in node.name[1:-1]:
                    if not node.name.startswith('__'):  # Allow magic methods
                        suggestions.append(f"Function '{node.name}' should use snake_case naming")
            
            elif isinstance(node, ast.ClassDef):
                if not node.name[0].isupper():
                    suggestions.append(f"Class '{node.name}' should use PascalCase naming")
        
        # Check for docstrings
        functions_without_docstrings = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and len(node.body) > 0:
                if not (isinstance(node.body[0], ast.Expr) and 
                       isinstance(node.body[0].value, ast.Constant) and 
                       isinstance(node.body[0].value.value, str)):
                    functions_without_docstrings.append(node.name)
        
        if functions_without_docstrings:
            suggestions.append(f"Functions missing docstrings: {', '.join(functions_without_docstrings[:3])}")
        
        return suggestions

class JavaScriptASTAnalyzer:
    """JavaScript-specific AST analyzer (simplified)"""
    
    def analyze(self, code: str) -> ASTAnalysis:
        """Basic JavaScript analysis without external parser"""
        issues = []
        structure = {'estimated_functions': code.count('function') + code.count('=>')}
        
        # Basic checks
        if 'var ' in code:
            issues.append("Consider using 'let' or 'const' instead of 'var'")
        
        if '==' in code and '===' not in code:
            issues.append("Consider using strict equality (===) instead of loose equality (==)")
        
        return ASTAnalysis(
            language='javascript',
            structure=structure,
            complexity={'estimated': 'medium'},
            issues=issues,
            metrics={'line_count': len(code.split('\n'))},
            security_concerns=[],
            performance_issues=[],
            best_practices=issues
        )

class JavaASTAnalyzer:
    """Java-specific AST analyzer (simplified)"""
    
    def analyze(self, code: str) -> ASTAnalysis:
        """Basic Java analysis"""
        issues = []
        
        # Count classes and methods
        class_count = code.count('class ')
        method_count = code.count('public ') + code.count('private ') + code.count('protected ')
        
        structure = {
            'classes': class_count,
            'estimated_methods': method_count
        }
        
        # Basic checks
        if 'System.out.println' in code:
            issues.append("Consider using proper logging instead of System.out.println")
        
        return ASTAnalysis(
            language='java',
            structure=structure,
            complexity={'estimated': 'medium'},
            issues=issues,
            metrics={'line_count': len(code.split('\n'))},
            security_concerns=[],
            performance_issues=[],
            best_practices=issues
        )

class CppASTAnalyzer:
    """C/C++ AST analyzer (simplified)"""
    
    def analyze(self, code: str) -> ASTAnalysis:
        """Basic C/C++ analysis"""
        issues = []
        
        # Basic structure detection
        function_count = code.count('int ') + code.count('void ') + code.count('char ')
        
        structure = {
            'estimated_functions': function_count,
            'has_main': 'int main' in code
        }
        
        # Basic checks
        if 'malloc' in code and 'free' not in code:
            issues.append("Memory allocated with malloc but no corresponding free found")
        
        if 'printf' in code and '#include <stdio.h>' not in code:
            issues.append("Using printf without including stdio.h")
        
        return ASTAnalysis(
            language='cpp',
            structure=structure,
            complexity={'estimated': 'medium'},
            issues=issues,
            metrics={'line_count': len(code.split('\n'))},
            security_concerns=[],
            performance_issues=[],
            best_practices=issues
        )

def format_ast_analysis_for_gemini(analysis: ASTAnalysis) -> str:
    """Format AST analysis results for inclusion in Gemini prompt"""
    
    result = f"""
## 🔍 Code Analysis Summary (Pre-Review)

**Language**: {analysis.language.title()}

### 📊 Code Structure:
{_format_dict(analysis.structure)}

### 📈 Complexity Analysis:
{_format_dict(analysis.complexity)}

### 📏 Code Metrics:
{_format_dict(analysis.metrics)}

### ⚠️ Identified Issues:
{_format_list(analysis.issues, "No issues detected")}

### 🔒 Security Concerns:
{_format_list(analysis.security_concerns, "No security concerns detected")}

### ⚡ Performance Issues:
{_format_list(analysis.performance_issues, "No performance issues detected")}

### 💡 Best Practice Suggestions:
{_format_list(analysis.best_practices, "Code follows best practices")}

---
**Note**: Please consider this analysis in your detailed code review below.
"""
    
    return result.strip()

def _format_dict(data: Dict[str, Any]) -> str:
    """Format dictionary data for display"""
    if not data:
        return "- No data available"
    
    items = []
    for key, value in data.items():
        if isinstance(value, list):
            value = f"{len(value)} items" if value else "None"
        elif isinstance(value, dict):
            value = f"{len(value)} entries" if value else "Empty"
        items.append(f"- **{key.replace('_', ' ').title()}**: {value}")
    
    return '\n'.join(items)

def _format_list(items: List[str], empty_message: str) -> str:
    """Format list data for display"""
    if not items:
        return f"- {empty_message}"
    
    return '\n'.join([f"- {item}" for item in items[:5]])  # Limit to 5 items