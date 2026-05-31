# Rust Under-the-Hood: Complete Documentation Index

## 📖 Welcome

This comprehensive documentation explores Rust's inner workings—from the memory layout of simple types to the architecture of the Tokio async runtime. Each document is self-contained yet interconnected, allowing you to jump to topics of interest or follow the learning path.

**Latest Rust Version Covered:** 1.75+

---

## 🎯 Learning Paths

### **Path 1: Foundations** (Complete before diving deeper)
1. [Fundamentals](02-fundamentals.md) - Variables, types, basic concepts
2. [Memory Management](03-memory-management.md) - Ownership, stack, heap
3. [Borrowing & References](04-borrowing-references.md) - Borrow rules
4. [Functions & Execution](05-function-execution.md) - Stack frames, calls

### **Path 2: Type System Mastery**
5. [Lifetimes](06-lifetimes.md) - Lifetime annotations and rules
6. [Structs](07-structs.md) - Memory layout and alignment
7. [Enums](08-enums.md) - Discriminants and tagging
8. [Generics](09-generics.md) - Type parameters and monomorphization
9. [Trait System](10-traits.md) - Virtual tables and dispatch

### **Path 3: Advanced Memory**
10. [Smart Pointers](11-smart-pointers.md) - Box, Rc, Arc, Weak
11. [Interior Mutability](12-interior-mutability.md) - Cell, RefCell, Mutex
12. [Trait Objects](15-trait-objects.md) - Fat pointers and polymorphism

### **Path 4: Safety & Errors**
13. [Error Handling](13-error-handling.md) - Panic, Result, Option
14. [Pattern Matching](14-pattern-matching.md) - Compilation and optimization

### **Path 5: Concurrency** (Most advanced)
15. [Concurrency & Threading](17-concurrency.md) - Threads, channels, Send/Sync
16. [Parallel Programming with Rayon](18-rayon.md) - Work-stealing, data parallelism
17. [Async/Await & Futures](16-async-await.md) - State machines, Pin
18. [Tokio Async Runtime](19-tokio.md) - I/O multiplexing, scheduling

### **Path 6: Advanced Topics**
19. [Macros & Metaprogramming](20-macros.md) - Expansion, hygiene
20. [Optimization](21-optimization.md) - Compiler tricks, zero-cost abstractions
21. [Advanced Rust](22-advanced.md) - Unsafe, FFI, SIMD, allocators
22. [Real-World Examples](23-examples.md) - Combining everything together

---

## 📚 Quick Reference by Topic

### Memory & Allocation
- **Stack vs Heap?** → [Memory Management](03-memory-management.md)
- **How is memory laid out?** → [Structs](07-structs.md), [Enums](08-enums.md)
- **What are smart pointers?** → [Smart Pointers](11-smart-pointers.md)

### Types & Generics
- **How do generics work?** → [Generics](09-generics.md)
- **What's monomorphization?** → [Generics](09-generics.md#monomorphization)
- **Trait objects?** → [Trait Objects](15-trait-objects.md)

### Lifetimes & Borrowing
- **How does the borrow checker work?** → [Borrowing & References](04-borrowing-references.md)
- **What are lifetimes?** → [Lifetimes](06-lifetimes.md)
- **Interior mutability?** → [Interior Mutability](12-interior-mutability.md)

### Execution & Concurrency
- **How do function calls work?** → [Functions & Execution](05-function-execution.md)
- **Threading?** → [Concurrency & Threading](17-concurrency.md)
- **Async/await?** → [Async/Await & Futures](16-async-await.md)
- **Tokio?** → [Tokio Async Runtime](19-tokio.md)
- **Rayon parallelism?** → [Rayon](18-rayon.md)

### Advanced
- **Pattern matching internals?** → [Pattern Matching](14-pattern-matching.md)
- **Unsafe Rust?** → [Advanced Rust](22-advanced.md)
- **Compiler optimizations?** → [Optimization](21-optimization.md)

---

## 🔑 Key Concepts Glossary

| Concept | Doc | Quick Explanation |
|---------|-----|-------------------|
| **Ownership** | Memory Mgmt | Three rules: move, borrow, drop |
| **Borrow Checker** | Borrowing | Static analysis ensuring memory safety |
| **Monomorphization** | Generics | Compiler creates specialized code for each type |
| **Virtual Table (vtable)** | Traits | Pointer table for dynamic dispatch |
| **Fat Pointer** | Trait Objects | Pointer + vtable pointer (16 bytes) |
| **State Machine** | Async | Compiled form of async functions |
| **Work Stealing** | Rayon | Idle threads steal work from busy ones |
| **Executor** | Tokio | Component that runs futures to completion |
| **Pin** | Async | Ensures value doesn't move in memory |
| **Send/Sync** | Concurrency | Marker traits for thread safety |

---

## 📊 Document Overview

```
01. Index (you are here) .................. Navigation & quick reference
02. Fundamentals ......................... Basic types and concepts
03. Memory Management ..................... Ownership, stack, heap
04. Borrowing & References ............... Borrow checker rules
05. Functions & Execution ................ Call stack, closures
06. Lifetimes ............................ Lifetime annotations
07. Structs ............................. Memory layout, alignment
08. Enums ............................... Discriminants, tagging
09. Generics ............................ Monomorphization
10. Trait System ........................ Virtual tables, dispatch
11. Smart Pointers ...................... Box, Rc, Arc, Weak
12. Interior Mutability ................. Cell, RefCell, Mutex
13. Error Handling ...................... Panic, Result, Option
14. Pattern Matching .................... Compilation, optimization
15. Trait Objects ....................... Fat pointers, polymorphism
16. Async/Await & Futures ............... State machines, Pin
17. Concurrency & Threading ............. Threads, channels, atomics
18. Rayon Parallelism ................... Work stealing, thread pool
19. Tokio Runtime ........................ I/O multiplexing, scheduling
20. Macros ............................. Expansion, hygiene
21. Optimization ........................ Compiler tricks, inlining
22. Advanced Rust ....................... Unsafe, FFI, SIMD
23. Real-World Examples ................. Practical combining everything
```

---

## 🎓 How to Use This Documentation

1. **First Time?** Start with [Fundamentals](02-fundamentals.md) → [Memory Management](03-memory-management.md)
2. **Looking for specific topic?** Use the Quick Reference section above
3. **Want deep understanding?** Follow one of the Learning Paths
4. **Already know Rust?** Jump to [Async/Await](16-async-await.md) or [Rayon](18-rayon.md)
5. **Curious about internals?** See [Advanced Rust](22-advanced.md)

---

## 📝 What You'll Learn

✅ How variables are stored in memory
✅ Why Rust has lifetimes and what they mean
✅ How the borrow checker prevents data races
✅ Memory layout of structs, enums, and generic types
✅ How function calls work at the assembly level
✅ Virtual tables and dynamic dispatch
✅ Async/await compilation to state machines
✅ Tokio's I/O multiplexing architecture
✅ Rayon's work-stealing algorithm
✅ Interior mutability patterns
✅ Zero-cost abstractions
✅ Compiler optimizations

---

## 💡 Cross-References

Throughout the documentation, you'll find references to related concepts:
- `→ See [Topic](path.md)` - Learn more about this topic
- `§ Section X.Y` - Specific section reference
- `⚡ Performance Note` - Performance implications

---

**Ready to dive in?** Start with [02-fundamentals.md](02-fundamentals.md)! 🚀
