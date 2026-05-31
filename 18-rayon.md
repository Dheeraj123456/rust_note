# Rayon: Data Parallelism with Work-Stealing Under the Hood

## Overview
Rayon provides **data-parallel** abstractions using a **work-stealing scheduler**. Unlike Tokio (task-parallel, async), Rayon targets **CPU-bound parallel computations** with declarative API that parallelizes iterators automatically.

---

## 1. Parallelism vs Concurrency

### Parallelism (Rayon)
```rust
use rayon::prelude::*;

let sum: i32 = (1..1000)
    .into_par_iter()
    .map(|x| x * x)
    .sum();
```

**Characteristics:**
- Multiple threads execute **simultaneously**
- Work on **independent data**
- CPU-bound (compute-intensive)
- Goal: utilize all CPU cores

### Concurrency (Tokio)
```rust
#[tokio::main]
async fn main() {
    let fut1 = some_io_operation();
    let fut2 = some_io_operation();
    
    let (r1, r2) = tokio::join!(fut1, fut2);
}
```

**Characteristics:**
- Single or few threads **interleave** work
- Work on **shared state**
- I/O-bound (I/O-intensive)
- Goal: handle many concurrent operations

---

## 2. Rayon Work-Stealing Scheduler

### Thread Pool
```rust
use rayon::prelude::*;

// Default: thread pool with CPU core count threads
let pool = rayon::ThreadPoolBuilder::new()
    .num_threads(4)  // Explicit control
    .build()
    .unwrap();

pool.install(|| {
    (0..100)
        .into_par_iter()
        .for_each(|i| println!("{}", i));
});
```

### Work-Stealing Queue Structure

```plantuml
@startuml
rectangle "Rayon Work-Stealing Scheduler" {
    rectangle "Thread 0" {
        rectangle "Local deque\n[work] [work] [work]" #E8F4F8
    }
    rectangle "Thread 1" {
        rectangle "Local deque\n[work]" #D4E8F0
    }
    rectangle "Thread 2" {
        rectangle "Local deque" #C0D8E8
    }
    rectangle "Thread 3" {
        rectangle "Local deque\n[work] [work]" #B8D0E0
    }
}

note right : Idle threads steal tasks from busy threads\nMinimizes load imbalance
@enduml
```

---

## 3. Iterator Parallelization

### Sequential Iterator
```rust
let result: Vec<i32> = (0..1000)
    .iter()
    .map(|x| x * 2)
    .collect();
```

**Execution:** Single thread processes all 1000 elements sequentially.

### Parallel Iterator
```rust
use rayon::prelude::*;

let result: Vec<i32> = (0..1000)
    .into_par_iter()
    .map(|x| x * 2)
    .collect();
```

**Execution:** Multiple threads work on chunks in parallel.

### Compiler Transformation

```plantuml
@startuml
state "into_par_iter()" as create: Create ParallelIterator\nDivide work into chunks
state "map(fn)" as map: Closure captured\nWill run in parallel
state "collect()" as collect: Synchronization point\nWait for all threads\nCombine results

create --> map: Setup
map --> collect: Schedule on threadpool
collect --> [*]: Return Vec
@enduml
```

---

## 4. Work Division Strategy

### Divide and Conquer
```rust
(0..1000).into_par_iter().map(f).collect()
```

**Thread pool with 4 threads:**

```
Iteration 0-249:   Thread 0 (chunk 0)
Iteration 250-499: Thread 1 (chunk 1)
Iteration 500-749: Thread 2 (chunk 2)
Iteration 750-999: Thread 3 (chunk 3)
```

### Dynamic Load Balancing
```
Initial state:
  Thread 0: [chunk0: 250 tasks]  ← Busy
  Thread 1: [chunk1: 250 tasks]  ← Busy
  Thread 2: [chunk2: 250 tasks]  ← Busy
  Thread 3: [chunk3: 250 tasks]  ← Busy

If Thread 0 finishes early:
  Thread 0: []                    ← Idle
  → Steals work from Thread 1
  → Now helps finish Thread 1's chunk
```

**Result:** Better CPU utilization than naive chunking.

---

## 5. Join and Fork

### Explicit Parallelism
```rust
use rayon::prelude::*;

let (left, right) = rayon::join(
    || expensive_left_computation(),
    || expensive_right_computation()
);
// left and right computed in parallel
```

### join() Implementation

```plantuml
@startuml
state "Parent thread" as parent: Calls join(left_fn, right_fn)
state "Spawn" as spawn: Enqueue right_fn on threadpool\nParent runs left_fn
state "Parent work" as pwork: Execute left_fn
state "Worker thread" as worker: Dequeue right_fn\nExecute right_fn
state "Synchronize" as sync: Parent waits for worker\nCombine results

parent --> spawn: Divide work
spawn --> pwork: Parent computes left
spawn --> worker: Worker computes right
pwork --> sync: Parent blocks until both done
worker --> sync: Worker completes
sync --> [*]: Return (left_result, right_result)
@enduml
```

---

## 6. Divide and Conquer Example

### Merge Sort with Rayon
```rust
fn merge_sort(v: &mut [i32]) {
    if v.len() <= 1000 {
        // Base case: sort sequentially (small)
        v.sort();
    } else {
        let mid = v.len() / 2;
        rayon::join(
            || merge_sort(&mut v[..mid]),
            || merge_sort(&mut v[mid..])
        );
        // Merge halves
    }
}
```

**Parallel execution tree:**

```
                [full array]
                /          \
         (parallel)      (parallel)
           /                    \
      [left half]           [right half]
       /      \              /      \
      /        \            /        \
    ...       ...         ...        ...
    
At leaf (1000 elements): sequential sort
Then merge back up the tree in parallel
```

---

## 7. Thread Safety and Scope

### Scope Guards Ownership
```rust
let mut data = vec![1, 2, 3];

rayon::scope(|s| {
    s.spawn(|_| {
        // Can capture &mut data safely
        data[0] = 10;
    });
    s.spawn(|_| {
        data[1] = 20;
    });
    // Scope waits for all spawns to complete before returning
});

println!("{:?}", data);  // [10, 20, 3]
```

**Safety mechanism:**

```plantuml
@startuml
state "Scope entered" as enter: Borrow checker sees mutable borrow
state "Spawn tasks" as spawn: Tasks executed in parallel\nBut within scope
state "Scope waits" as wait: All tasks must complete\nBefore scope returns
state "Scope exited" as exit: Borrow returned to caller\nSafe mutable access

enter --> spawn: Guard borrowed access
spawn --> wait: (parallel execution)
wait --> exit: Scope synchronization ensures safety
@enduml
```

---

## 8. Reduction and Combine

### Parallel Reduce
```rust
use rayon::prelude::*;

let sum: i32 = (1..1000)
    .into_par_iter()
    .reduce(|| 0, |a, b| a + b);
```

**Execution model:**

```
[1,2,3,4,5,6,7,8]

Thread 0: 1+2+3+4 = 10
Thread 1: 5+6+7+8 = 26
Main:    10+26 = 36
```

### Tree Reduction (binary tree combine)

```plantuml
@startuml
state "Leaf nodes" as leaf: 4 threads compute partial sums\n[1,2,3,4], [5,6,7,8], [9,10], [11,12]
state "Sum 0" as sum0: 1+2+3+4=10
state "Sum 1" as sum1: 5+6+7+8=26
state "Sum 2" as sum2: 9+10=19
state "Sum 3" as sum3: 11+12=23

state "Level 1 combine" as l1: Combine pairs\n10+26=36, 19+23=42
state "Level 2 combine" as l2: Combine results\n36+42=78

leaf --> sum0: Partial sum
leaf --> sum1: Partial sum
leaf --> sum2: Partial sum
leaf --> sum3: Partial sum

sum0 --> l1: Combine
sum1 --> l1: Combine
sum2 --> l2: Combine
sum3 --> l2: Combine

l1 --> l2: Combine
l2 --> [*]: Final result: 78
@enduml
```

---

## 9. Rayon vs Tokio

### Comparison

```plantuml
@startuml
class "Rayon (Parallelism)" as rayon {
    Data-parallel
    CPU-bound
    Fine-grained tasks
    Work-stealing scheduler
    Blocks on synchronization
    Good for: computing
}

class "Tokio (Concurrency)" as tokio {
    Task-parallel
    I/O-bound
    Coarse-grained tasks
    Event-driven scheduler
    Async/await model
    Good for: networking
}

rayon --|> Parallelism
tokio --|> Concurrency
@enduml
```

---

## 10. Memory Model

### No Shared State Mutations (Usually)
```rust
// Safe: each thread has its own closure
(0..1000)
    .into_par_iter()
    .for_each(|i| {
        let local_var = i * 2;  // Thread-local
        println!("{}", local_var);  // No races
    });
```

### Shared State with Thread-Safe Types
```rust
use std::sync::atomic::AtomicU64;
use std::sync::Arc;

let counter = Arc::new(AtomicU64::new(0));

(0..1000)
    .into_par_iter()
    .for_each(|_| {
        counter.fetch_add(1, Relaxed);  // Thread-safe atomic
    });
```

---

## 11. Performance Characteristics

### When Rayon Excels
```
Parallel sum of 1 million numbers:
Seq:   1000 ms
Par:   250 ms (4 threads)
Speedup: 4× (near-linear!)

Reason: CPU-bound, embarrassingly parallel
```

### When Rayon Struggles
```
Parallel: send value over channel:
Seq:   100 ns
Par:   10 μs (contention on lock-free queue!)
Slowdown: 100×

Reason: Too much synchronization overhead
```

---

## 12. Example: Parallel Map Reduce

```rust
use rayon::prelude::*;
use std::collections::HashMap;

let data = vec![1, 2, 3, 4, 5, 6, 7, 8];

// Parallel map
let counts: Vec<(i32, usize)> = data
    .into_par_iter()
    .map(|x| (x, 1))
    .collect();

// Parallel reduce to combine
let result: HashMap<i32, usize> = counts
    .into_par_iter()
    .reduce(
        HashMap::new,
        |mut map, (k, v)| {
            *map.entry(k).or_insert(0) += v;
            map
        }
    );
```

---

## 13. Overhead and When to Use

### Overhead
```
Spawning a task: ~1-10 μs
Stealing work: ~100 ns

Only parallelize if:
- Task > 10 μs of work
- Multiple tasks with good locality
```

### Decision Tree

```plantuml
@startuml
state "Work is parallelizable?" as par
state "Yes" as yes
state "No" as no
state "Each task > 10 μs?" as size
state "Large" as large
state "Small" as small

par --> yes: Independent data\nNo shared state races
par --> no: Sequential

yes --> size: Estimate work per task
size --> large: Use Rayon!
size --> small: Sequential\n(overhead > benefit)
@enduml
```

---

## 14. Thread Pool Internals

### Stealing Algorithm
```
If local_queue is not empty:
  Pop task from local_queue
  Execute task
Else (idle):
  For each other thread:
    Try to steal from other.queue
    If successful: execute
    Else: continue to next
  If nothing stolen:
    Thread parks (waits for work)
```

### Wake-up
```
When new work enqueued:
1. Check for idle threads
2. Wake one thread (unpark)
3. Woken thread dequeues work
4. Other threads steal as needed
```

---

## Summary

| Aspect | Rayon | Tokio |
|--------|-------|-------|
| **Best for** | CPU-bound parallelism | I/O-bound concurrency |
| **Scheduling** | Work-stealing | Event-driven |
| **Threads** | One per CPU core | Configurable |
| **Blocking** | Allowed (efficient) | Problematic (starves executor) |
| **Scalability** | O(cores) | O(tasks) |

---

**Next:** [Concurrency & Threads →](17-concurrency.md) Learn threading, channels, atomics.
