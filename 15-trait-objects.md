# Trait Objects: Fat Pointers, Polymorphism, and Dynamic Dispatch

## Overview
Trait objects enable **runtime polymorphism** through dynamic dispatch. Implemented as **fat pointers** (data pointer + virtual table pointer), they allow calling methods on unknown concrete types.

---

## 1. Static vs Dynamic Dispatch

### Static Dispatch (Generics)
```rust
fn process<T: Drawable>(item: T) {
    item.draw();  // Resolved at compile time
}

process(circle);    // Generates code for Circle::draw
process(square);    // Generates code for Square::draw
```

**Result:** Separate function for each type (monomorphization).

### Dynamic Dispatch (Trait Objects)
```rust
fn process(item: &dyn Drawable) {
    item.draw();  // Resolved at runtime via vtable
}

process(&circle);   // Same function for all types
process(&square);   // Looks up method in vtable
```

**Result:** Single function, method lookup via pointer.

---

## 2. Trait Object Creation

### Type Erasure
```rust
trait Animal {
    fn speak(&self);
}

impl Animal for Dog {
    fn speak(&self) { println!("Woof!"); }
}

impl Animal for Cat {
    fn speak(&self) { println!("Meow!"); }
}

let dog: Box<dyn Animal> = Box::new(Dog);  // Type erased
let cat: &dyn Animal = &Cat;               // Type erased
```

### Boxing into Trait Objects
```rust
let animals: Vec<Box<dyn Animal>> = vec![
    Box::new(Dog),
    Box::new(Cat),
];

for animal in animals {
    animal.speak();  // Dispatches to correct implementation
}
```

---

## 3. Fat Pointer Structure

### Trait Object Representation

```plantuml
@startuml
rectangle "Trait Object (&dyn Trait)" {
    rectangle "8 bytes: data_ptr" {
        rectangle "Pointer to actual object" #E8F4F8
    }
    rectangle "8 bytes: vtable_ptr" {
        rectangle "Pointer to virtual table" #D4E8F0
    }
}
note right : Total: 16 bytes on 64-bit systems
@enduml
```

### Box<dyn Trait> Layout
```rust
println!("{}", std::mem::size_of::<Box<dyn Animal>>());  // 16 bytes
println!("{}", std::mem::size_of::<&dyn Animal>());      // 16 bytes

// Compare:
println!("{}", std::mem::size_of::<Box<Dog>>());         // 8 bytes
println!("{}", std::mem::size_of::<&Dog>());             // 8 bytes
```

---

## 4. Virtual Table (vtable)

### VTable Structure

```plantuml
@startuml
rectangle "VTable for Animal" {
    rectangle "drop_glue: *const fn(&mut Self)" {
        rectangle "Pointer to drop implementation\nCleans up resources" #FFE8D6
    }
    rectangle "size: usize" {
        rectangle "Size of concrete type (e.g., 24 for Dog)" #E8F4F8
    }
    rectangle "align: usize" {
        rectangle "Alignment requirement" #D4E8F0
    }
    rectangle "speak: *const fn(&Self)" {
        rectangle "Pointer to Dog::speak()" #C0D8E8
    }
    rectangle "other_method: *const fn(...)" {
        rectangle "Pointers to other trait methods" #B8D0E0
    }
}
@enduml
```

### VTable Creation (Compile-Time)
```rust
// For Dog implementing Animal:
const DOG_VTABLE: &VTable = &VTable {
    drop_glue: <Dog as Drop>::drop,
    size: std::mem::size_of::<Dog>(),
    align: std::mem::align_of::<Dog>(),
    speak: <Dog as Animal>::speak,
};

// For Cat implementing Animal:
const CAT_VTABLE: &VTable = &VTable {
    drop_glue: <Cat as Drop>::drop,
    size: std::mem::size_of::<Cat>(),
    align: std::mem::align_of::<Cat>(),
    speak: <Cat as Animal>::speak,
};
```

---

## 5. Method Dispatch

### Calling Through Trait Object
```rust
let animal: &dyn Animal = &dog;
animal.speak();
```

### Dispatch Sequence

```plantuml
@startuml
state "Load data_ptr from trait object" as load: address of Dog instance
state "Load vtable_ptr from trait object" as vtable: address of DOG_VTABLE
state "Find method in vtable" as find: vtable.speak
state "Call method with data_ptr" as call: Dog::speak(&dog_instance)
state "Execute method" as exec: Prints "Woof!"

load --> vtable: Get vtable address
vtable --> find: Lookup method
find --> call: Method found
call --> exec: Run method code
@enduml
```

### Assembly-Like Pseudocode
```asm
; Load trait object (16 bytes)
mov rax, [trait_obj]        ; rax = data_ptr
mov rcx, [trait_obj + 8]    ; rcx = vtable_ptr

; Call method
mov r11, [rcx + 24]         ; r11 = vtable.speak (offset 24)
call r11                     ; Call speak(&dog_instance)
```

---

## 6. Object Safety

### Requirements for Trait Objects
```rust
// Object-safe trait: ✓
trait Animal {
    fn speak(&self);
}

// NOT object-safe: ✗ (returns Self)
trait Cloneable {
    fn clone(&self) -> Self;  // ERROR: can't return dyn Trait
}

// NOT object-safe: ✗ (takes Self)
trait Movable {
    fn move_it(self);  // ERROR: can't consume dyn Trait
}
```

### Why Not Object-Safe?
```rust
// This would be impossible:
let animal: &dyn Animal = &dog;
let cloned = animal.clone();  // What type is cloned?
                              // We don't know!
```

**Trait object requires:** all methods can work on `&dyn Trait` (or `&mut`).

---

## 7. Upcasting and Downcasting

### Upcasting (Safe)
```rust
let dog: Dog = Dog;
let animal: &dyn Animal = &dog;  // Upcast (always safe)
```

### Downcasting (Unsafe)
```rust
use std::any::Any;

let animal: &dyn Any = &dog;

if let Some(dog) = animal.downcast_ref::<Dog>() {
    println!("It's a dog!");
}
```

### Downcast Sequence

```plantuml
@startuml
state "Get type_id from vtable" as get: Stored in object
state "Compare with target type" as compare: target == Dog?
state "Match" as match: Yes
state "Cast to Dog*" as cast: Reinterpret pointer
state "Return Some(dog)" as some: Downcast successful
state "No match" as nomatch: No
state "Return None" as none: Type mismatch

get --> compare: Check type
compare --> match: Same type
compare --> nomatch: Different type
match --> cast: Safe to cast
cast --> some: Return reference
nomatch --> none: Can't cast
@enduml
```

---

## 8. Performance Cost of Dynamic Dispatch

### Method Call Overhead

```
Static dispatch (inline):
call Dog::speak
(function address known, CPU can inline)

Dynamic dispatch (vtable):
mov rax, [vtable]           ; Load vtable
mov rcx, [rax + offset]     ; Load method pointer
call rcx                    ; Indirect call (1-2 cycle penalty)
```

**Cost:** 1-2 CPU cycles per method call (cache misses possible).

### Benchmark
```
Direct call: 1 ns
Virtual call: 3-5 ns (3-5× overhead for small methods)
```

---

## 9. Trait Object with Associated Types

### Associated Types Not Object-Safe
```rust
trait Container {
    type Item;
    fn get(&self) -> Self::Item;
}

// Can't create trait object (Item type unknown)
let c: Box<dyn Container> = Box::new(...);  // ERROR
```

**Reason:** Associated type must be concrete, but type erased.

---

## 10. Trait Objects and Ownership

### Box<dyn Trait>
```rust
let animal: Box<dyn Animal> = Box::new(Dog);
// Box owns Dog
// When Box dropped, Dog dropped

drop(animal);  // Dog cleaned up via drop_glue
```

### Reference &dyn Trait
```rust
let dog = Dog;
let animal: &dyn Animal = &dog;

// &dyn Animal doesn't own Dog
// Dog must live longer than reference
```

---

## 11. VTable Encoding

### Type Information in VTable
```rust
// VTable contains:
struct VTable {
    drop_fn: unsafe fn(*mut ()),      // Drop implementation
    size: usize,                       // Size of concrete type
    align: usize,                      // Alignment
    
    // Method pointers (in declaration order)
    method1: unsafe fn(*const ()),
    method2: unsafe fn(*const (), i32),
    // ... more methods
}
```

### Multiple Trait Objects
```rust
trait A { fn a(&self); }
trait B { fn b(&self); }

impl A for Dog { fn a(&self) { ... } }
impl B for Dog { fn b(&self) { ... } }

let a: &dyn A = &dog;  // VTable for A
let b: &dyn B = &dog;  // VTable for B (different)

// Two different trait objects for same Dog!
```

---

## 12. Combining Multiple Traits

### Supertraits
```rust
trait Animal: Drawable + Named {
    fn speak(&self);
}

impl Animal for Dog {
    fn speak(&self) { println!("Woof"); }
}

// Dog must implement Drawable + Named too
let animal: &dyn Animal = &dog;  // VTable includes methods from Drawable, Named
```

### Trait Object with Multiple Bounds
```rust
fn process(item: &(dyn Animal + Send + Sync)) {
    // Can call Animal methods
    // Guaranteed to be Send + Sync
}
```

---

## 13. Example: Polymorphic Vec

```rust
trait Command {
    fn execute(&mut self);
}

struct Commands(Vec<Box<dyn Command>>);

impl Commands {
    fn run(&mut self) {
        for cmd in &mut self.0 {
            cmd.execute();  // Dispatch through vtable
        }
    }
}
```

### Memory Layout

```plantuml
@startuml
skinparam componentStyle rectangle

package "Vec<Box<dyn Command>>" {
    [Box<dyn Command>\nentry 0] as box_a1 #E8F4F8
    [Box<dyn Command>\nentry 1] as box_b #D4E8F0
    [Box<dyn Command>\nentry 2] as box_a2 #E8F4F8
}

package "Heap Objects" {
    rectangle "CommandA instance" as obj_a1 #C8E6C9
    rectangle "CommandB instance" as obj_b #FFE8D6
    rectangle "CommandA instance" as obj_a2 #C8E6C9
}

package "Read-only VTables" {
    [VTable for CommandA] as vtable_a #B8D0E0
    [VTable for CommandB] as vtable_b #A8C8D8
}

box_a1 --> obj_a1 : data pointer
box_a1 ..> vtable_a : vtable pointer
box_b --> obj_b : data pointer
box_b ..> vtable_b : vtable pointer
box_a2 --> obj_a2 : data pointer
box_a2 ..> vtable_a : vtable pointer
@enduml
```

---

## 14. Comparison: Static vs Dynamic

```plantuml
@startuml
rectangle "Static Dispatch (Generic)" as static {
    rectangle "Code: One per type" #C8E6C9
    rectangle "Binary size: Large" #C8E6C9
    rectangle "Performance: O(1) inline" #C8E6C9
    rectangle "Compile time: Slow" #D6D6FF
}

rectangle "Dynamic Dispatch (Trait Object)" as dynamic {
    rectangle "Code: Single" #FFE8D6
    rectangle "Binary size: Small" #FFE8D6
    rectangle "Performance: O(1) vtable" #FFE8D6
    rectangle "Compile time: Fast" #D6D6FF
}
@enduml
```

---

## Summary

| Aspect | Trait Object | Generic |
|--------|-------------|---------|
| **Dispatch** | Dynamic (runtime) | Static (compile-time) |
| **Fat Pointer** | 16 bytes (ptr + vtable) | N/A |
| **Type Erasure** | Yes | No |
| **Code Size** | Smaller | Larger (monomorphization) |
| **Speed** | Slightly slower | Faster (inlining) |
| **Object Safety** | Required | N/A |

---

**Next:** [Concurrency & Threading →](17-concurrency.md) Learn threads, channels, atomics, memory ordering.
