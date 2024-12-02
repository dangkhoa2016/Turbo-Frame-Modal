import { Controller } from '@hotwired/stimulus';
import Choices from 'choices.js';

export default class extends Controller {
  static targets = ["select"];

  static values = {
    fetchUrl: String,
    itemsPerPage: { type: Number, default: 10 },
    minSearchLength: { type: Number, default: 1 },
    loadDataOnStart: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
  };

  // Initialize internal state variables
  currentPage = 1;
  isLoading = false;
  hasMoreData = true;
  triggerSearch = false;
  keyword = '';
  choices = null;
  cacheSearchHintElement = null;

  connect() {
    console.log('ChoicesRemoteDataController connected', this, this.element);

    this.fetchDataFromServer = this.fetchDataFromServer.bind(this);
    this.initializeChoices();
  }

  // Fetch data from the server
  fetchDataFromServer() {
    const query = `page=${this.currentPage}&per_page=${this.itemsPerPageValue}&keyword=${this.keyword || ''}`;
    const fetchUrlHasQuery = this.fetchUrlValue.includes('?');
    const url = `${this.fetchUrlValue}${fetchUrlHasQuery ? '&' : '?'}${query}`;

    return fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.length < this.itemsPerPageValue) {
          this.hasMoreData = false;
        }
        return data.map(item => ({
          value: item.value,
          label: item.label,
        }));
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        return [];
      });
  }

  fetchUrlValueChanged(newVal, oldVal) {
    // console.log('fetchUrlValueChanged', this.fetchUrlValue, newVal, oldVal);
    this.currentPage = 1;
    this.hasMoreData = true;
    this.triggerSearch = true;
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

  // Initialize Choices.js
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
        placeholder: ['choices__placeholder', 'text-secondary'],
        itemSelectable: ['choices__item--selectable', 'text-secondary'],
      },
      removeItemButton: true,
      callbackOnInit: function () {
        controller.initializeChoicesCallback(this);
        if (controller.disabledValue) {
          this.disable();
          return;
        }

        if (controller.loadDataOnStartValue) {
          this.setChoices(controller.fetchDataFromServer, 'value', 'label', false);
        } else {
          controller.triggerSearch = true;
        }
      },
    });
  }

  // Add search hint option to the select element
  addSearchHintOptionToElement(element) {
    if (!element) return;

    const searchHintOption = document.createElement('option');
    searchHintOption.classList.add('search-hint');
    searchHintOption.innerText = `Enter more than ${this.minSearchLengthValue} character(s)`;
    searchHintOption.setAttribute('data-label-class', 'search-hint');
    searchHintOption.setAttribute('disabled', 'disabled');
    element.appendChild(searchHintOption);
  }

  // Handle search functionality
  handleSearchInput(event) {
    this.keyword = event.target.value;
    if (this.keyword.length === 0) {
      this.hideSearchHintMessage();
      this.currentPage = 1;
      this.hasMoreData = true;
      this.triggerSearch = false;
      this.loadOptionItemsWithSearchHint();
      return;
    }

    if (this.keyword.length <= this.minSearchLengthValue) {
      this.toggleSelectableItemsVisibility('none');
      this.displaySearchHint(`Enter more than ${this.minSearchLengthValue} characters`);
      return;
    }

    this.currentPage = 1;
    this.hasMoreData = true;
    this.triggerSearch = true;
    this.loadOptionItemsWithSearchHint(true);
  }

  handleKeyUpInput = (event) => {
    if (this.handleKeyUpInput.timeout) clearTimeout(this.handleKeyUpInput.timeout);

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

    choicesInstance.passedElement.element.addEventListener('change', () => {
      if (this.keyword) {
        this.currentPage = 1;
        this.keyword = null;
        this.triggerSearch = true;
        this.hasMoreData = true;
      }

      this.element.dispatchEvent(new CustomEvent("choices-remote-data:change", {
        detail: { value: choicesInstance.getValue() },
        bubbles: false,
        composed: true
      }));
    });

    choicesInstance.passedElement.element.addEventListener('showDropdown', () => {
      if (this.triggerSearch) {
        this.triggerSearch = false;
        this.loadOptionItemsWithSearchHint();
      }
    });

    choicesInstance.input.element.addEventListener('keyup', this.handleKeyUpInput);

    this.choices = choicesInstance;
    this.cacheSearchHintElement = choicesInstance._store.state.choices[0].choiceEl;
  }

  // Check if dropdown is scrolled to the bottom and load more data
  checkIfDropdownScrolledToBottom() {
    if (!this.hasMoreData) return;

    const scrollableElement = this.choices.choiceList.element;
    const bottomOfDropdown = scrollableElement.scrollHeight - scrollableElement.scrollTop === scrollableElement.clientHeight;

    if (bottomOfDropdown && !this.isLoading) {
      this.isLoading = true;
      this.currentPage++;
      this.choices.setChoices(this.fetchDataFromServer, 'value', 'label', false);
      this.isLoading = false;
    }
  }

  // Display search hint
  displaySearchHint(message) {
    let hintElement = this.choices.choiceList.element.querySelector('[data-label-class="search-hint"]');
    if (!hintElement) {
      this.choices.choiceList.element.children[0].style.display = 'none';
      this.choices.choiceList.element.appendChild(this.cacheSearchHintElement);
      hintElement = this.choices.choiceList.element.querySelector('[data-label-class="search-hint"]');
    }

    const hintText = hintElement.querySelector('.search-hint');
    hintElement.style.display = 'block';
    hintText.innerText = message;
  }

  // Hide search hint message
  hideSearchHintMessage() {
    const hintElement = this.choices.choiceList.element.querySelector('[data-label-class="search-hint"]');
    if (hintElement) hintElement.style.display = 'none';
  }

  // Toggle visibility of selectable items
  toggleSelectableItemsVisibility(displayStyle) {
    const items = this.choices.choiceList.element.querySelectorAll('[data-choice-selectable]');
    if (!items) return;

    items.forEach(item => {
      item.style.display = displayStyle;
    });
  }

  // Load option items with search hint
  loadOptionItemsWithSearchHint(displaySearchHint = false) {
    this.choices._store._state.choices = this.choices._store._state.choices.filter(item => item.labelClass?.includes('search-hint'));
    this.choices.passedElement.element.querySelectorAll(':not([data-label-class="search-hint"],[selected])').forEach(item => item.remove());
    this.toggleSelectableItemsVisibility('none');
    this.displaySearchHint(displaySearchHint ? `Searching for "${this.keyword}"...` : 'Loading...');

    this.choices.setChoices(this.fetchDataFromServer, 'value', 'label', false).then(() => {
      this.hideSearchHintMessage();
    });
  }
}
