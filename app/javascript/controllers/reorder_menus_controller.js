import { Controller } from '@hotwired/stimulus';
import { Sortable, MultiDrag } from 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.3/+esm';

export default class extends Controller {
  static targets = ['available', 'selected'];

  connect() {
    try {
      Sortable.mount(new MultiDrag());
    } catch (error) {
      console.log('Failed to mount MultiDrag:', error);
    }


    this.storedLeftItems = [];
    this.availableTarget.querySelectorAll('[data-id]').forEach((item) => {
      this.storedLeftItems.push(item.dataset.id);
    });

    this.storedRightItems = [];
    this.selectedTarget.querySelectorAll('[data-id]').forEach((item) => {
      this.storedRightItems.push(item.dataset.id);
    });

    this.leftList = new Sortable(this.availableTarget, {
      group: { name: 'shared' },
      sort: true,
      animation: 150,
      multiDrag: true,
      selectedClass: 'active',
      fallbackTolerance: 3,
      // onEnd: this.updateItemsOrder.bind(this)
    });

    this.rightList = new Sortable(this.selectedTarget, {
      group: 'shared',
      animation: 150,
      multiDrag: true,
      selectedClass: 'active',
      fallbackTolerance: 3,
      onSort: this.updateItemsOrder.bind(this)
    });

    this.renderStoredItems();

    const moveAllFromLeft = document.querySelectorAll('button.moveAllFromLeft');
    const moveAllFromRight = document.querySelectorAll('button.moveAllFromRight');
    const sortLeftBtn = document.querySelector('#sortLeft');
    const sortRightBtn = document.querySelector('#sortRight');

     // Move all items from left to right
     moveAllFromLeft.forEach(btn => {
      btn.addEventListener('click', () => {
        this.moveAllItems(this.availableTarget, this.selectedTarget);
      });
    });

    // Move all items from right to left
    moveAllFromRight.forEach(btn => {
      btn.addEventListener('click', () => {
        this.moveAllItems(this.selectedTarget, this.availableTarget);
      });
    });

    // Sort the left list
    sortLeftBtn.addEventListener('click', () => {
      this.sortList(this.availableTarget, this.storedLeftItems);
    });

    // Sort the right list
    sortRightBtn.addEventListener('click', () => {
      this.sortList(this.selectedTarget, this.storedRightItems);
    });
  }

  // Function to update the order of items
  updateItemsOrder() {
    this.storedLeftItems.length = 0;
    this.storedRightItems.length = 0;

    // Update left items order
    Array.from(this.availableTarget.children).forEach(item => {
      this.storedLeftItems.push(item.dataset.id);
    });

    // Update right items order
    Array.from(this.selectedTarget.children).forEach(item => {
      this.storedRightItems.push(item.dataset.id);
    });

    this.renderStoredItems();
  }

  renderStoredItems() {
    // const leftJson = JSON.stringify(this.storedLeftItems);
    // const rightJson = JSON.stringify(this.storedRightItems);
    const event = new CustomEvent('reorder-menus-controller:selected-menus-changed', {
      detail: this.storedRightItems,
    });
    this.element.dispatchEvent(event);
  };

  moveAllItems(fromList, toList) {
    Array.from(fromList.children).forEach(item => {
      toList.appendChild(item);
    });
    this.updateItemsOrder();
  }

    // Function to sort the items
  sortList(list, storedItems) {
    const items = Array.from(list.children);
    this.customSort(items);

    const ids = items.map(item => item.dataset.id);
    if (JSON.stringify(ids) === JSON.stringify(storedItems)) {
      console.log('The list is already sorted');
      return;
    }

    // Remove all children and re-append in sorted order
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    items.forEach(item => {
      list.appendChild(item);
    });

    this.updateItemsOrder();
  }

  // Function to perform custom sorting
  customSort(arr) {
    const extractNumberFromEnd = (text) => {
      const match = text.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : NaN;
    };

    const extractLeadingNumber = (text) => {
      const match = text.match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : NaN;
    };

    arr.sort((a, b) => {
      const leadingNumA = extractLeadingNumber(a.innerText);
      const leadingNumB = extractLeadingNumber(b.innerText);

      const trailingNumA = extractNumberFromEnd(a.innerText);
      const trailingNumB = extractNumberFromEnd(b.innerText);

      if (!isNaN(leadingNumA) && !isNaN(leadingNumB)) {
        return leadingNumA - leadingNumB;
      }

      if (!isNaN(leadingNumA)) return -1;
      if (!isNaN(leadingNumB)) return 1;

      if (!isNaN(trailingNumA) && !isNaN(trailingNumB)) {
        return trailingNumA - trailingNumB;
      }

      return a.innerText.localeCompare(b.innerText);
    });
  }
}
