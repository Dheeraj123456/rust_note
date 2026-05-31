# Function Execution & Call Stack: Under the Hood

## Overview
Understanding how functions execute in Rust means knowing how the call stack grows, how parameters are passed, and how return values are handled—all with ownership semantics baked in.

---

## 1. The Call Stack

### What is the Call Stack?
The **call stack** is a LIFO (Last-In-First-Out) data structure that tracks **stack frames**—one for each active function call.

```rust
fn main() {
    let x = 5;
    add_one(x);  // new frame pushed
    // add_one frame popped
}

fn add_one(n: i32) -> i32 {
    n + 1  // frame active while this executes
}
```

**Stack evolution:**

```plantuml
@startuml
rectangle "Call Stack Evolution" {
    rectangle "After main() starts" {
        rectangle "main frame\nsp: [stack pointer]" #E8F4F8
    }
    rectangle "Inside add_one()" {
        rectangle "main frame\nx = 5" #F0F0F0
        rectangle "add_one frame\nn = 5 (copy)\nReturn address" #D4E8F0
    }
    rectangle "After add_one() returns" {
        rectangle "main frame\nx = 5\nresult = 6" #E8F4F8
    }
    rectangle "After main() ends" {
        rectangle "[empty]" #F0F0F0
    }
}
@enduml
```

---

## 2. Stack Frames

### Frame Layout (x86-64)
Each stack frame contains:
1. **Local variables** - allocated in order
2. **Temporary values** - intermediate computations
3. **Return address** - where to jump after function ends
4. **Previous frame pointer** (optional) - for debugging

```plantuml
@startuml
rectangle "Stack Frame Layout" {
    rectangle "Higher addresses\n(older data)" #F0F0F0
    rectangle "Previous Frame\n[parent function data]" #E8F4F8
    rectangle "Return Address\n(jump back here)" #FFE8D6
    rectangle "Local Variables\nx: i32, y: i32" #D4E8F0
    rectangle "Temporary Values\n(intermediate)" #C0D8E8
    rectangle "Stack Pointer (sp)\n(current bottom)" #B8D0E0
    rectangle "Lower addresses\n(newer data)" #F0F0F0
}
@enduml
```

---

## 3. Parameter Passing

### Move vs Copy for Parameters

```rust
fn process_copy(x: i32) {
    println!("{}", x);
}  // i32 is Copy

fn process_move(s: String) {
    println!("{}", s);
}  // String is NOT Copy, ownership moves

let n = 42;
process_copy(n);  // Copy: n still valid

let s = String::from("hello");
process_move(s);  // Move: s is invalid after call
```

**Parameter passing mechanism:**

```plantuml
@startuml
rectangle "Copy Parameter (i32)" {
    rectangle "Caller Stack" {
        rectangle "n: 42 (i32)\n4 bytes" #E8F4F8
    }
    rectangle "copy (bitwise)" #FFE8D6
    rectangle "Callee Stack" {
        rectangle "x: 42 (i32)\n4 bytes\n(separate copy)" #D4E8F0
    }
    rectangle "Result\nn still valid!" #C8E6C9
}

rectangle "Move Parameter (String)" {
    rectangle "Caller Stack" {
        rectangle "s (String owner)\nptr: 0x1000, len: 5" #E8F4F8
    }
    rectangle "move (pointer)\ninvalidates source" #FFE8D6
    rectangle "Callee Stack" {
        rectangle "s_param (String owner)\nptr: 0x1000, len: 5\n(same heap)" #D4E8F0
    }
    rectangle "Result\ns invalid!" #FFD6D6
}
@enduml
```

---

## 4. Return Values and Move Semantics

### Returning Owned Values
```rust
fn make_string() -> String {
    let s = String::from("hello");
    s  // Ownership moves out
}  // s is NOT dropped here (moved)

let result = make_string();  // Receive ownership
```

**Stack during return:**

```plantuml
@startuml
state "Inside make_string()" as inside: let s = String::from("hello")\nFrame: s (owner)
state "Return starts" as ret: return s\nOwnership moves out
state "After return" as after: result receives\nownership\nOriginal frame destroyed

inside --> ret: execute return
ret --> after: stack frame popped\ns ownership in result
@enduml
```

### Return Value Optimization (RVO)
Modern Rust compilers apply **Return Value Optimization**:

```rust
fn expensive() -> String {
    String::from("hello world")
}

let s = expensive();  // Compiler may avoid extra copy
```

**With RVO (optimized):**
```
1. Caller allocates space for return value
2. Callee builds String in that space
3. No move/copy needed
```

**Without RVO (slower):**
```
1. Callee creates String on own stack
2. Returns by moving
3. Caller receives ownership
4. Possible extra copy
```

Most Rust code doesn't see the difference—the compiler optimizes it.

---

## 5. Closures and Their Memory Layout

### What is a Closure?
A closure is a function that **captures variables from its environment**.

```rust
let x = 42;
let y = 10;

let add_x = |z: i32| {
    x + y + z  // Captures x and y
};

add_x(5);  // 42 + 10 + 5 = 57
```

### Closure Representation
The compiler translates a closure into a **struct** with captured variables + `FnOnce`, `FnMut`, or `Fn` trait:

```rust
// Original closure:
let add_x = |z| x + y + z;

// Compiler generates (approximately):
struct Closure {
    x: i32,  // captured by value
    y: i32,  // captured by value
}

impl Fn<(i32,)> for Closure {
    extern "rust-call" fn call(&self, args: (i32,)) -> i32 {
        self.x + self.y + args.0
    }
}
```

**Memory layout:**

```plantuml
@startuml
rectangle "Closure Memory Layout" {
    rectangle "Stack" {
        rectangle "add_x (Closure struct)\n[inline]" {
            rectangle "x: 42 (i32)" #E8F4F8
            rectangle "y: 10 (i32)" #D4E8F0
        }
    }
    rectangle "Note: No heap allocation\nCaptures stored in struct" #F5F5F5
}
@enduml
```

### Capture Types

```rust
let x = 42;

// 1. Capture by immutable reference (&T)
let borrow = || println!("{}", x);

// 2. Capture by mutable reference (&mut T)
let mut y = 10;
let borrow_mut = || y += 1;

// 3. Capture by value (move)
let owned = move || { x + 1 };  // owns x
```

**Trait implementation based on captures:**

```plantuml
@startuml
class "Fn" as fn {
    Calls: &self
    Closure borrows immutably
}

class "FnMut" as fnmut {
    Calls: &mut self
    Closure borrows mutably
}

class "FnOnce" as fnonce {
    Calls: self (consumes)
    Closure takes ownership
}

fnmut --|> fn: extends
fnonce --|> fnmut: extends
@enduml
```

---

## 6. Function Pointers vs Closures

### Function Pointers (`fn`)
```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

let f: fn(i32, i32) -> i32 = add;  // Function pointer
f(3, 5);  // Calls add
```

**Size and representation:**
```plantuml
@startuml
rectangle "Function Pointer vs Closure" {
    rectangle "Function Pointer (&fn)" {
        rectangle "Size: 8 bytes (x86-64)\nContains: Address to function" #E8F4F8
    }
    rectangle "Closure (Fn)" {
        rectangle "Size: Varies\nContains: Captured data + function pointer" #D4E8F0
    }
}
@enduml
```

### Size Difference
```rust
fn simple_fn(x: i32) -> i32 { x + 1 }

let fn_ptr: fn(i32) -> i32 = simple_fn;
println!("{}", std::mem::size_of_val(&fn_ptr));  // 8 bytes

let x = 10;
let closure = |y: i32| x + y;
println!("{}", std::mem::size_of_val(&closure));  // 4 bytes (just x)

let closure2 = |y: i32| simple_fn(y) + 1;
println!("{}", std::mem::size_of_val(&closure2));  // 0 bytes (no capture!)
```

---

## 7. Tail Call Optimization (TCO)

### Is Tail Call Optimized?
Rust **does NOT guarantee** tail call optimization, but the compiler may apply it.

```rust
fn factorial(n: u32, acc: u32) -> u32 {
    if n == 0 {
        acc
    } else {
        factorial(n - 1, acc * n)  // Tail call
    }
}
```

**Without TCO (new frame each call):**
```
factorial(5, 1)
  factorial(4, 5)
    factorial(3, 20)
      factorial(2, 60)
        factorial(1, 120)
          factorial(0, 120)  ← returns
          
Stack depth: 6 frames
```

**With TCO (frame reused):**
```
Same function, same frame, just update registers
Stack depth: 1 frame
```

**Current Rust (1.75):** TCO is not guaranteed. Use **iterative** code for guaranteed stack efficiency:

```rust
fn factorial_iter(n: u32) -> u32 {
    (1..=n).product()  // No recursion
}
```

---

## 8. Inline Functions

### `#[inline]` Attribute
The `#[inline]` attribute suggests the compiler substitute the function body at the call site:

```rust
#[inline]
fn add_one(x: i32) -> i32 {
    x + 1
}

let result = add_one(42);
```

**Without inline (with function call):**
```
1. Push stack frame
2. Copy parameter
3. Execute function body
4. Pop stack frame
5. Return to caller
```

**With inline (inlined):**
```
1. Substitute: result = 42 + 1
2. No function call overhead
```

### Inline Hints

```rust
#[inline]        // Suggest inline (compiler decides)
#[inline(always)]  // Force inline (rarely needed)
#[inline(never)]   // Prevent inline

pub fn ...
```

---

## 9. The Stack Pointer and Frame Pointer

### x86-64 Registers
- **RSP** (stack pointer) - points to top of stack
- **RBP** (frame/base pointer) - points to current frame's base (optional)

```plantuml
@startuml
rectangle "x86-64 Stack Registers" {
    rectangle "RBP\n(frame pointer)\noptional" #E8F4F8
    rectangle "[points here]" #FFE8D6
    rectangle "Higher addresses" #F0F0F0
    rectangle "---" #F0F0F0
    rectangle "Local variables" #D4E8F0
    rectangle "RSP\n(stack pointer)\nalways valid" #E8F4F8
    rectangle "[points here]" #FFE8D6
    rectangle "Lower addresses" #F0F0F0
}
@enduml
```

Modern Rust often omits RBP to save a register.

---

## 10. Example: Complete Stack Trace

```rust
fn main() {
    let x = 5;
    let y = helper(x);
    println!("{}", y);
}

fn helper(a: i32) -> i32 {
    let b = a + 1;
    process(b)
}

fn process(p: i32) -> i32 {
    p * 2
}
```

**Stack evolution:**

```plantuml
@startuml
state "1. main() starts" as s1: main frame\nx = 5
state "2. helper() called" as s2: main frame\nhel frame\na = 5 (copy)
state "3. process() called" as s3: main frame\nhel frame\nproc frame\np = 6 (copy)
state "4. process() returns" as s4: main frame\nhel frame\n[result = 12]\nproc frame popped
state "5. helper() returns" as s5: main frame\n[result = 12]\nhel frame popped
state "6. main() ends" as s6: [empty]

s1 --> s2: Call helper(5)
s2 --> s3: Call process(6)
s3 --> s4: Return 12
s4 --> s5: Return 12
s5 --> s6: Program ends
@enduml
```

---

## 11. Performance: Stack vs Heap

```
Stack allocation: O(1), just move RSP
Heap allocation: O(n), malloc + initialize

Stack access: Cache-friendly, predictable
Heap access: Pointer chase, potential cache miss

Stack: Automatic cleanup (scope exit)
Heap: Manual or via Drop trait
```

**Rule of thumb:** Use stack when possible, heap for large/dynamic data.

---

## 12. Debugging: Stack Frames

View the call stack during debugging:

```rust
use std::backtrace::Backtrace;

fn crash_here() {
    let bt = Backtrace::capture();
    println!("{}", bt);  // Print full call stack
}
```

Output shows:
- Each function in the call chain
- Memory addresses (useful for binary inspection)
- Source line numbers (if debug info available)

---

## Key Takeaways

| Concept | Mechanism |
|---------|-----------|
| **Call Stack** | LIFO stack of frames tracking execution |
| **Stack Frame** | Contains locals, return address, temp values |
| **Parameters** | Copied (Copy types) or moved (non-Copy types) |
| **Return Values** | Moved to caller (RVO may optimize) |
| **Closures** | Compiled to structs with captured variables |
| **Inlining** | Optional optimization to avoid call overhead |
| **Tail Calls** | NOT guaranteed optimized in Rust |

---

**Next:** [Lifetimes →](06-lifetimes.md) Understand lifetime parameters and their enforcement.
