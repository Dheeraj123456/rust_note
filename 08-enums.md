# Enums: Discriminant and Tag Representation Under the Hood

## Overview
Enums in Rust are **tagged unions** (also called discriminated unions). Each enum variant is tagged with a discriminant, allowing the compiler to track which variant is active and enforce safe pattern matching.

---

## 1. Enum Basics and Discriminants

### Simple Enum
```rust
enum Color {
    Red,
    Green,
    Blue,
}
```

**Representation:**
- Each variant gets a **discriminant** (an integer tag)
- `Red = 0`, `Green = 1`, `Blue = 2` (assigned automatically)

```plantuml
@startuml
rectangle "Color Enum Representation" {
    rectangle "Discriminant (tag)" {
        rectangle "0 = Red" #FFE8D6
        rectangle "1 = Green" #D4E8F0
        rectangle "2 = Blue" #C0D8E8
    }
    rectangle "Storage: 1 byte (fits 0-2)" #E8F4F8
}
@enduml
```

### Explicit Discriminants
```rust
enum Status {
    Pending = 0,
    Running = 1,
    Complete = 2,
}
```

---

## 2. Enums with Data

### Variants with Payloads
```rust
enum Result<T, E> {
    Ok(T),      // Variant with data
    Err(E),     // Variant with data
}
```

**Memory layout:**

```plantuml
@startuml
rectangle "Result<i32, String> Layout" {
    rectangle "Tag (discriminant)" {
        rectangle "0 = Ok" #FFD6D6
        rectangle "1 = Err" #D4E8F0
    }
    rectangle "Data Union" {
        rectangle "T (i32) = 4 bytes" #E8F4F8
        rectangle "OR" #F0F0F0
        rectangle "E (String) = 24 bytes" #C0D8E8
    }
}
note right : Size = tag (1 byte)\n     + data (24 bytes max)\n     + padding\n     = 32 bytes total
@enduml
```

### Size Calculation
```rust
// Worst case: use largest variant
enum Result<i32, String> {
    Ok(i32),           // 4 bytes
    Err(String),       // 24 bytes (pointer + len + cap)
}

// Compiler allocates:
// - Discriminant: 1 byte (for 2 variants)
// - Padding: 7 bytes (alignment)
// - Data: 24 bytes (largest variant)
// Total: 32 bytes
```

---

## 3. The Discriminant

### Automatic Discriminants (C-like)
```rust
enum Direction {
    North,   // 0
    South,   // 1
    East,    // 2
    West,    // 3
}

println!("{}", Direction::North as u8);  // 0
```

### Explicit Discriminants
```rust
enum HttpStatus {
    Ok = 200,
    NotFound = 404,
    ServerError = 500,
}
```

### `#[repr]` for Discriminant Type
```rust
#[repr(u8)]
enum Small {
    A, B, C  // Uses u8 (1 byte)
}

#[repr(u32)]
enum Large {
    X, Y, Z  // Uses u32 (4 bytes)
}

println!("{}", std::mem::size_of::<Small>());  // 1
println!("{}", std::mem::size_of::<Large>());  // 4
```

---

## 4. Tagless Enums (Niche Optimization)

### Rust's Niche Optimization
Rust is smart about reducing enum size when possible:

```rust
enum Option<T> {
    Some(T),
    None,
}

// Option<u32>: 8 bytes (not 5 or 9!)
println!("{}", std::mem::size_of::<Option<u32>>());  // 8

// WHY? u32 uses values 0..=4294967295
// Rust reserves one "niche" value (e.g., 0xFFFFFFFF) to represent None
// No separate discriminant needed!
```

**Memory layout:**

```plantuml
@startuml
rectangle "Option<u32> with Niche" {
    rectangle "Scenario 1: Some(42)" {
        rectangle "u32 value: 42" #E8F4F8
        rectangle "Discriminant: encoded in value" #F5F5F5
    }
    rectangle "Scenario 2: None" {
        rectangle "u32 value: 0xFFFFFFFF" #D4E8F0
        rectangle "(niche value = None)" #F5F5F5
    }
    rectangle "Total: 4 bytes (just u32!)" #C8E6C9
}
@enduml
```

### Example: Option Sizes
```rust
println!("{}", std::mem::size_of::<Option<u8>>());   // 1 (niche optimization)
println!("{}", std::mem::size_of::<Option<i32>>());  // 4 (niche optimization!)
println!("{}", std::mem::size_of::<Option<bool>>()); // 1 (u8 can fit tag + bool)
println!("{}", std::mem::size_of::<Option<String>>());  // 24 (String size unchanged)
```

---

## 5. Pattern Matching Compilation

### How Pattern Matching Works
```rust
match result {
    Ok(value) => println!("Value: {}", value),
    Err(e) => println!("Error: {}", e),
}
```

**Compilation (conceptual):**
```rust
match result {
    Ok(value) => {
        // Check discriminant == 0
        let value = result.data;  // Extract data
        println!("Value: {}", value);
    },
    Err(e) => {
        // Check discriminant == 1
        let e = result.data;  // Extract data
        println!("Error: {}", e);
    },
}
```

### Exhaustiveness Checking
The compiler ensures all variants are handled:

```rust
match result {
    Ok(_) => {},
    // ERROR: missing Err variant
}

match result {
    Ok(_) => {},
    Err(_) => {},
    // OK: all variants handled
}
```

---

## 6. Common Enums

### `Option<T>`
```rust
enum Option<T> {
    Some(T),
    None,
}

// Size: same as T (usually, with niche optimization)
let x: Option<i32> = Some(42);  // 4 bytes
let y: Option<i32> = None;      // 4 bytes
```

### `Result<T, E>`
```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}

// Size: max(T, E) + overhead
let success: Result<i32, String> = Ok(42);
let error: Result<i32, String> = Err("failed".to_string());
```

**Memory:**

```plantuml
@startuml
rectangle "Option vs Result Size" {
    rectangle "Option<i32>" {
        rectangle "Size: 4 bytes" #E8F4F8
        rectangle "(niche: None uses sentinel value)" #F5F5F5
    }
    rectangle "Result<i32, String>" {
        rectangle "Size: 32 bytes" #D4E8F0
        rectangle "(discriminant + max(i32, String))" #F5F5F5
    }
}
@enduml
```

---

## 7. Unsafe Discriminant Access

### Direct Discriminant Queries
```rust
use std::mem::discriminant;

enum Color { Red, Green, Blue }

let red = Color::Red;
let green = Color::Green;

println!("{:?}", discriminant(&red));      // Discriminant { ... }
println!("{}", discriminant(&red) == discriminant(&green));  // false
```

### Manual Discriminant Inspection
```rust
#[repr(u8)]
enum Direction {
    North = 0,
    South = 1,
}

unsafe {
    println!("{}", std::mem::transmute::<Direction, u8>(Direction::North));  // 0
}
```

---

## 8. Enum Size Optimization Tricks

### Add `#[repr(u8)]` for Small Enums
```rust
#[repr(u8)]  // Only 1 byte instead of default
enum Status {
    Pending,
    Running,
    Complete,
}

println!("{}", std::mem::size_of::<Status>());  // 1
```

### Use Smaller Payloads
```rust
// Larger:
enum Data {
    Small(u64),
    Large(Box<Vec<u8>>),  // Pointer, not inline data
}

// This keeps Size(Data) small
```

### Reorder Variants (with `#[repr(C)]`)
```rust
#[repr(C)]
enum Result {
    Ok(u64),     // 8 bytes
    Err(u32),    // 4 bytes (plus padding)
}
```

---

## 9. Zero-Sized Enums

### Enums with No Data
```rust
enum Void {}  // No variants at all

println!("{}", std::mem::size_of::<Void>());  // 0
```

Cannot create values of type `Void`—used in type systems for "impossible" cases.

---

## 10. Pattern Matching Examples

### Match Guard Optimization
```rust
match result {
    Ok(n) if n > 0 => println!("Positive"),
    Ok(_) => println!("Non-positive"),
    Err(_) => println!("Error"),
}
```

Compiler generates:
```
1. Extract discriminant
2. If Ok:
     a. Extract value
     b. Check guard (n > 0)
     c. Execute arm if true
3. If Err: execute error arm
```

### Exhaustive vs Non-Exhaustive
```rust
#[non_exhaustive]
pub enum ApiResponse {
    Success,
    Failure,
}

// Users cannot match exhaustively (new variants might be added)
// Users must use _ catch-all
match resp {
    ApiResponse::Success => {},
    ApiResponse::Failure => {},
    _ => {},  // Required for non-exhaustive enum
}
```

---

## 11. Enum Size Reference

```
enum Type                    Size (typical)    Notes
────────────────────         ──────────────    ─────────────
Void (no variants)           0                 Uninhabited type

Unit (no data)               1                 Just discriminant

Option<()>                   1                 Niche optimization

Option<bool>                 1                 Fits in one byte

Option<u32>                  4                 Niche optimization

Option<String>               24 or 32          Niche may not work

Result<u32, u32>             8                 Discriminant + 4 bytes

Result<String, String>       48-56             Two 24-byte variants
```

---

## 12. Discriminant Memory Location

### Where is the Discriminant Stored?
Typically **at the beginning** of the enum:

```plantuml
@startuml
rectangle "Result<String, u32> Layout" {
    rectangle "Discriminant (tag)\noffset 0" #FFD6D6
    rectangle "Padding\n(alignment)" #FFE8D6
    rectangle "Data Union" {
        rectangle "Ok(String): 24 bytes" #D4E8F0
        rectangle "OR" #F0F0F0
        rectangle "Err(u32): 4 bytes" #C0D8E8
    }
}
@enduml
```

Sometimes Rust **folds** the discriminant into unused bits of data (niche optimization).

---

## Key Takeaways

| Concept | Details |
|---------|---------|
| **Discriminant** | Tag integer identifying which variant is active |
| **Size** | max(variant_sizes) + tag overhead |
| **Niche Optimization** | Reuse unused values as variant markers (free tag!) |
| **Pattern Matching** | Exhaustiveness checking at compile-time |
| **Option<T>** | Usually same size as T (niche) |
| **Result<T,E>** | max(T, E) + tag overhead |

---

**Next:** [Generics →](09-generics.md) Learn monomorphization and type specialization.
