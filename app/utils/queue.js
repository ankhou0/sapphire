/**
* Implementation of Queue.
*/
class Queue {
  /**
   * Create a queue.
   */
  constructor (maxSize, store, front, end) {
    this.store = [];
    this.front = 0;
    this.end = 0;

    this.maxSize = 0;

    if(arguments.length === 1){ //max size
      this.maxSize = maxSize;
    }

    if(arguments.length === 4){ //clone constructor
      this.maxSize = maxSize;
      this.store = store;
      this.front = front;
      this.end = end;
    }
  }

}

/**
 * Add item to end of queue.
 * @param {*} The data to store in the position.
 */
Queue.prototype.enqueue = function (data) {
  if(this.maxSize > 0 && this.size() === this.maxSize){
    this.dequeue();
  }
  this.store[this.end] = data;
  this.end++;
};

/**
 * Remove item from queue and return its data.
 * @return {*} The data stored in item.
 */
Queue.prototype.dequeue = function () {
  if (this.front === this.end) return null;

  const data = this.store[this.front];
  delete this.store[this.front];
  this.front++;
  return data;
};

/**
 * Return current size of queue.
 * @return {number} Size of queue.
 */
Queue.prototype.size = function () {
  return this.end - this.front;
};

/**
 * Clear the queue
 */
Queue.prototype.clear = function () {
      this.store = [];
      this.front = 0;
      this.end = 0;
};

/**
 * Copy the queue
 * @return new copy of this queue
 */
Queue.prototype.clone = function () {
      return new Queue(this.maxSize, this.store, this.front, this.end);
};

/**
 * Return item at front of queue without dequeueing.
 * @return {*} The data stored in item.
 */
Queue.prototype.peek = function () {
  if (this.size() === 0) return null;
  return this.store[this.front];
};

Queue.prototype.peekEnd = function () {
  if (this.size() === 0) return null;
  return this.store[this.end - 1];
};

Queue.prototype.toArray = function () {
  return this.store;
};



module.exports = Queue;
