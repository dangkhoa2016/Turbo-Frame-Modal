import { Controller } from '@hotwired/stimulus';
import Choices from 'choices.js';

export default class extends Controller {
  static targets = ['select'];

  static values = {
    fetchUrl: String,
    itemsPerPage: { type: Number, default: 10 },
    minSearchLength: { type: Number, default: 1 },
    loadDataOnStart: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    searchHintClass: String,
  };

  // Initialize internal state variables
  currentPage = 1;
  isLoading = false;
  hasMoreData = true;
  triggerSearch = false;
  keyword = '';
  previousKeyword = '';
  choices = null;
  cacheSearchHintElement = null;
  searchHintClass = null;

  connect() {
    console.log('ChoicesRemoteDataController connected', this, this.element);

    this.searchHintClass = this.searchHintClassValue || 'search-hint';
    this.searchHintText = `Enter at least ${this.minSearchLengthValue} character(s)`;
    this.fetchDataFromServer = this.fetchDataFromServer.bind(this);
    this.initializeChoices();
  }

  disconnect() {
    if (this.choices) {
      this.choices.destroy();
      this.choices = null;
    }
  }

  // Fetch data from the server
  fetchDataFromServer() {
    const query = `page=${this.currentPage}&per_page=${this.itemsPerPageValue}&keyword=${this.keyword || ''}`;
    const fetchUrlHasQuery = this.fetchUrlValue.includes('?');
    const url = `${this.fetchUrlValue}${fetchUrlHasQuery ? '&' : '?'}${query}`;

    return fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.length < this.itemsPerPageValue)
          this.hasMoreData = false;

        this.isLoading = false;
        this.triggerSearch = false;
        this.previousKeyword = this.keyword;
        const currentSelectedValues = this.choices?.getValue(true) || [];

        return data.map(item => ({
          value: item.value,
          label: item.label,
          disabled: currentSelectedValues.includes(item.value),
        }));
      })
      .catch(error => {
        this.isLoading = false;
        console.error('Error fetching data:', error);
        return [];
      });
  }

  fetchUrlValueChanged(newVal, oldVal) {
    // console.log('fetchUrlValueChanged', this.fetchUrlValue, newVal, oldVal);

    if (newVal) {
    this.triggerSearch = true;
      this.hasMoreData = true;
    } else {
      this.triggerSearch = false;
      this.hasMoreData = false;
    }

    this.currentPage = 1;
    this.keyword = '';
    this.clearSelection(true);
  }

  enableSelect() {
    if (this.choices)
      this.choices.enable();
  }

  disableSelect() {
    if (this.choices) {
      this.choices.disable();
      this.choices.containerOuter.removeFocusState();
    }
  }

  clearAllOptions() {
    if (this.choices)
      this.choices.clearChoices();
  }

  clearSelection(clearOptions = false) {
    if (this.choices) {
      const values = [].concat(this.choices.getValue(true));
      values.forEach(value => {
        this.choices.removeChoice(value);
      });
      if (clearOptions)
        this.clearAllOptions();
    }
  }

  // Initialize the Choices.js select element and bind event listeners
  initializeChoices() {
    if (this.choices) return;

    const controller = this;
    controller.addSearchHintOptionToElement(controller.selectTarget);

    new Choices(controller.selectTarget, {
      resetScrollPosition: false,
      searchChoices: false,
      searchFloor: controller.minSearchLengthValue,
      shouldSort: false,
      classNames: {
        containerOuter: ['choices', 'mt-2'],
        placeholder: ['choices__placeholder', 'text-gray-400'],
        itemSelectable: ['choices__item--selectable', 'text-gray-400'],
      },
      removeItemButton: true,
      callbackOnInit: function () {
        controller.initializeChoicesCallback(this);
        if (controller.disabledValue) {
          this.disable();
          return;
        }

        if (controller.loadDataOnStartValue && controller.fetchUrlValue) {
          controller.triggerSearch = false;
          this.setChoices(controller.fetchDataFromServer, 'value', 'label', true);
        }
        else if (controller.fetchUrlValue)
          controller.triggerSearch = true;
      },
    });
  }

  // Add search hint option to the select element
  addSearchHintOptionToElement(element) {
    if (!element)
      return;

    const searchHintOption = document.createElement('option');
    searchHintOption.classList.add(this.searchHintClass);
    searchHintOption.innerText = this.searchHintText;
    searchHintOption.setAttribute('data-label-class', this.searchHintClass);
    searchHintOption.setAttribute('disabled', 'disabled');
    element.appendChild(searchHintOption);
  }

  // Handle the search functionality
  handleSearchInput(event) {
    this.keyword = event.target.value;
    if (this.keyword.length === 0) {
      // check if user press backspace key or delete key
      if (event.keyCode === 8 || event.keyCode === 46) {
        // console.log('backspace or delete key pressed', event.keyCode);
        if (this.previousKeyword) {
          this.previousKeyword = '';
        }
        else {
          return;
        }
      }

      this.hideSearchHintMessage();

      this.currentPage = 1;
      this.hasMoreData = true;
      this.triggerSearch = false;
      this.loadOptionItemsWithSearchHint();
      return;
    }

    if (this.keyword.length < this.minSearchLengthValue) {
      this.toggleSelectableItemsVisibility('none');
      this.displaySearchHint(this.searchHintText);
      return;
    }

    this.currentPage = 1;
    this.hasMoreData = true;
    this.triggerSearch = true;
    this.loadOptionItemsWithSearchHint(true);
  }

  handleKeyUpInput = (event) => {
    if (this.handleKeyUpInput.timeout)
      clearTimeout(this.handleKeyUpInput.timeout);

    this.handleKeyUpInput.timeout = setTimeout(() => {
      this.handleSearchInput(event);
    }, 300);
  };

  // Initialize choices callback to handle scroll and search hint
  initializeChoicesCallback(choicesInstance) {
    choicesInstance.choiceList.element.addEventListener('scroll', this.checkIfDropdownScrolledToBottom.bind(this));

    choicesInstance.passedElement.element.addEventListener('hideDropdown', () => {
      choicesInstance.choiceList.scrollToTop();
    });

    choicesInstance.passedElement.element.addEventListener('removeItem', (ev) => {
      // this.choices.refresh();
      var removedItemIndex = this.choices._store._state.choices.findIndex(item => item.value === ev.detail.value);
      if (removedItemIndex === -1)
        return;

      this.choices._store._state.choices[removedItemIndex].disabled = false;
      if (this.choices._store._state.choices[removedItemIndex].choiceEl) {
        this.choices._store._state.choices[removedItemIndex].choiceEl.remove();
        delete this.choices._store._state.choices[removedItemIndex].choiceEl;
      }
    });

    choicesInstance.passedElement.element.addEventListener('change', () => {
      if (this.keyword) {
        this.currentPage = 1;
        this.keyword = this.choices.input.element.value;
        this.triggerSearch = true;
        this.hasMoreData = true;
      }

      this.element.dispatchEvent(new CustomEvent('choices-remote-data:change', {
        detail: { value: choicesInstance.getValue() },
        bubbles: false,
        composed: true
      }));
    });

    choicesInstance.passedElement.element.addEventListener('showDropdown', () => {
      if (this.keyword.length > 0 && this.keyword.length < this.minSearchLengthValue)
        return;

      if (this.triggerSearch) {
        this.triggerSearch = false;
        this.loadOptionItemsWithSearchHint();
      }
    });

    choicesInstance.input.element.addEventListener('keyup', this.handleKeyUpInput);

    this.choices = choicesInstance;
    this.cacheSearchHintElement = choicesInstance._store.state.choices.find(item => item.labelClass?.includes(this.searchHintClass)).choiceEl;
  }

  // Check if the dropdown is scrolled to the bottom and load more data
  checkIfDropdownScrolledToBottom() {
    if (!this.hasMoreData) {
      return;
    }

    const scrollableElement = this.choices.choiceList.element;
    const scrollPosition = (scrollableElement.scrollHeight - scrollableElement.scrollTop - scrollableElement.clientHeight);
    const bottomOfDropdown = scrollPosition < 30;
    if (bottomOfDropdown && !this.isLoading) {
      this.isLoading = true;
      this.currentPage++;

      this.choices.setChoices(this.fetchDataFromServer, 'value', 'label', false).then(() => {
        this.choices.input.element.focus();
      });
    }
  }

  // Show the search hint message
  displaySearchHint(message) {
    let hintElement = this.choices.choiceList.element.querySelector(`[data-label-class='${this.searchHintClass}']`);
    if (!hintElement) {
      this.choices.choiceList.element.children[0].style.display = 'none';
      this.choices.choiceList.element.appendChild(this.cacheSearchHintElement);
      hintElement = this.choices.choiceList.element.querySelector(`[data-label-class='${this.searchHintClass}']`);
    }

    const hintText = hintElement.querySelector(`.${this.searchHintClass}`);
    hintElement.style.display = 'block';
    hintText.innerText = message;
    hintText.style.display = 'block';
  }

  // Hide the search hint message
  hideSearchHintMessage() {
    const hintElement = this.choices.choiceList.element.querySelector(`[data-label-class='${this.searchHintClass}']`);
    if (hintElement)
      hintElement.style.display = 'none';
  }

  // Toggle the visibility of selectable items
  toggleSelectableItemsVisibility(displayStyle) {
    const items = this.choices.choiceList.element.querySelectorAll(`:not([data-label-class='${this.searchHintClass}']`);
    if (!items)
      return;

    items.forEach(item => {
      item.style.display = displayStyle;
    });
  }

  // Load option items with search hint in the dropdown
  loadOptionItemsWithSearchHint(displaySearchHint = false) {
    this.choices._store._state.choices = this.choices._store._state.choices.filter(item => item.labelClass?.includes(this.searchHintClass));
    this.choices.passedElement.element.querySelectorAll(`:not([data-label-class='${this.searchHintClass}'],[selected])`).forEach(item => item.remove());
    this.toggleSelectableItemsVisibility('none');
    setTimeout(() => {
      this.displaySearchHint(displaySearchHint ? `Searching for "${this.keyword}"...` : 'Loading...');
    }, 0);

    this.choices.setChoices(this.fetchDataFromServer, 'value', 'label', displaySearchHint ? false : true).then(() => {
      this.hideSearchHintMessage();
      if (displaySearchHint && this.choices._isSelectMultipleElement) {
        this.choices.itemList.element.replaceChildren('');
        this.choices._render();
      }
      this.choices.input.element.focus();
    });
  }
}