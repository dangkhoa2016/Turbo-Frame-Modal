import { Controller } from '@hotwired/stimulus'
import Choices from 'choices.js';

export default class extends Controller {
  static targets = ['select'];

  connect() {
    console.log('ChoicesController connected', this, this.element);
    if (this.choices)
      return;

    this.choices = new Choices(this.selectTarget, {
      classNames: {
        containerOuter: ['choices', 'mt-2'],
        placeholder: ['choices__placeholder', 'text-gray-400'],
        itemSelectable: ['choices__item--selectable', 'text-gray-400'],
      },
      removeItemButton: true,
    });
  }
}