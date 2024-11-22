import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
  static targets = ['turboFrame', 'errorContainer'];
  static values = { backdropZindex: String }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get isModalOpen() {
    return !this.modal?._isHidden;
  }

  get zIndexClass() {
    return this.backdropZindexValue || 'z-40';
  }

  get abortReason() {
    return 'Aborted by user';
  }

  connect() {
    this.turboFrameTargetId = this.turboFrameTarget.id;
    this.initEventHandlers();
    this.initModal();
    this.initHandleElements();
    this.initFrameEvent();
    this.initRetry();
    this.setLoading();

    document.addEventListener('turbo:before-stream-render', this.turboBeforeStreamRender);
  }

  disconnect() {
    this.cleanupEventHandlers();
    this.cleanupFrameEvent();
  }

  turboFrameTargetDisconnected(element) {
    this.cleanupFrameEvent(element);
  }

  initEventHandlers() {
    this.turboBeforeStreamRender = this.turboBeforeStreamRender.bind(this);
    this.showBsModal = this.showBsModal.bind(this);
    this.hideBsModal = this.hideBsModal.bind(this);
    this.handleTurboClickEvent = this.handleTurboClickEvent.bind(this);
    this.handleTurboSubmitStartEvent = this.handleTurboSubmitStartEvent.bind(this);
    this.handleFormFetchRequestError = this.handleFormFetchRequestError.bind(this);
    this.retryRequest = this.retryRequest.bind(this);
    this.handleTurboFrameFetchRequestError = this.handleTurboFrameFetchRequestError.bind(this);
    this.awaitHandleBeforeFetchRequest = this.awaitHandleBeforeFetchRequest.bind(this);
    this.handleBeforeFetchResponse = this.handleBeforeFetchResponse.bind(this);
    this.initFrameEvent = this.initFrameEvent.bind(this);
    this.turboBeforeStreamRender = this.turboBeforeStreamRender.bind(this);
    this.initHandleElements = this.initHandleElements.bind(this);
  }

  handleOtherRender(stream) {
    if (!stream)
      return;
    
    const streamTarget = stream.getAttribute('target') || stream.target;
    if (streamTarget !== this.turboFrameTargetId) {
      const element = document.getElementById(streamTarget);
      if (element) {
        element.setAttribute('wait-for-frame-replaced', 'true');
        this.waitForFrameReplaced(`#${streamTarget}[wait-for-frame-replaced]`, (result) => {
          if (!result) {
            console.log('waitForFrameReplaced: failed', streamTarget);
            const element = document.getElementById(streamTarget);
            if (element)
              element.removeAttribute('wait-for-frame-replaced');
            return;
          }

          this.modal.forceClose = true;
          this.close();
          this.constructor.sleep(800).then(() => {
            this.modal.forceClose = false;
          });

          const element = document.getElementById(streamTarget);
          if (element)
            this.initHandleElements(element);
        });
      }
    }
  }

  turboBeforeStreamRender(event) {
    if (!this.isModalOpen) {
      this.handleOtherRender(event.detail.newStream);
      return;
    }

    const stream = event.detail.newStream;
    if (!stream)
      return;

    const template = stream.querySelector('template');
    if (!template)
      return;

    
    const streamTarget = stream.getAttribute('target') || stream.target;
    if (streamTarget !== this.turboFrameTargetId) {
      this.handleOtherRender(stream);
      return;
    }
    
    this.turboFrameTarget.setAttribute('wait-for-frame-replaced', 'true');

    const doc = template.content;
    let turboFrame = doc.querySelector('turbo-frame');
    if (!turboFrame) {
      turboFrame = document.createElement('turbo-frame');
      turboFrame.id = this.turboFrameTargetId;
      turboFrame.setAttribute('data-modals-target', 'turboFrame');
      while (doc.firstChild)
        turboFrame.appendChild(doc.firstChild);
      template.content.appendChild(turboFrame);
    }

    if (turboFrame.id === this.turboFrameTargetId && !turboFrame.getAttribute('data-modals-target'))
      turboFrame.setAttribute('data-modals-target', 'turboFrame');

    event.detail.render(stream).then(() => {
      const backupId = this.turboFrameTargetId;

      this.waitForFrameReplaced(`turbo-frame#${backupId}[data-modals-target][wait-for-frame-replaced]`, (result) => {
        if (!result) {
          console.log('waitForFrameReplaced: failed', backupId);
          this.turboFrameTarget.removeAttribute('wait-for-frame-replaced');
          return;
        }

        const turboFrame = document.getElementById(this.turboFrameTargetId);
        this.initFrameEvent(turboFrame);
      });
    });
  }

  getTransitionDurationFromElement() {
    const element = this.element.querySelector('.modal-wrapper');
    if (!element) {
      return 0;
    }

    // Get transition-duration of the element
    let {
      transitionDuration,
      transitionDelay
    } = window.getComputedStyle(element);
    const floatTransitionDuration = Number.parseFloat(transitionDuration);
    const floatTransitionDelay = Number.parseFloat(transitionDelay);

    // Return 0 if element or transition duration is not found
    if (!floatTransitionDuration && !floatTransitionDelay) {
      return 0;
    }

    // If multiple durations are defined, take the first
    transitionDuration = transitionDuration.split(',')[0];
    transitionDelay = transitionDelay.split(',')[0];
    return (Number.parseFloat(transitionDuration) + Number.parseFloat(transitionDelay)) * 1000;
  }

  initFlowbite = (modal) => {
    // Set the backdrop classes dynamically
    modal._options.backdropClasses = modal._options.backdropClasses.replace(
      'z-40', 
      `transition-opacity duration-[200ms] ease-in-out opacity-0 ${this.zIndexClass}`
    );

    // Handle modal show animation
    const originalShow = modal.show;
    modal.show = () => {
      originalShow.call(modal);

      const wrapper = modal._targetEl.querySelector('.modal-wrapper');
      this.constructor.sleep(5).then(() => {
        wrapper.classList.add('opacity-100', 'translate-y-0');
        modal._backdropEl.classList.add('opacity-100');
      });

      modal.isTransitioning = true;
      this.showBsModal();
      const time = this.getTransitionDurationFromElement();
      this.constructor.sleep(time + 20).then(() => {
        modal.isTransitioning = false;
      });
    };

    // Handle modal hide animation
    const originalHide = modal.hide;
    modal.hide = () => {
      const wrapper = modal._targetEl.querySelector('.modal-wrapper');
      wrapper.classList.remove('opacity-100', 'translate-y-0');
      if (modal._backdropEl)
        modal._backdropEl.classList.remove('opacity-100');

      const time = this.getTransitionDurationFromElement();
      this.constructor.sleep(time + 20).then(() => {
        originalHide.call(modal);
        modal.isTransitioning = false;

        // re add overflow hidden to body if other modal is open
        if (document.querySelectorAll(`[data-controller="modals"].modal[aria-modal="true"]`).length > 0)
          document.body.classList.add('overflow-hidden');
      });
      this.hideBsModal();
    };
  }

  initModal() {
    this.isTransitioning = false;
    this.element.querySelectorAll('[data-modals-hide]').forEach((el) => {
      el.addEventListener('click', () => this.close());
    });

    const modal = new Flowbite.default.Modal(this.element, { placement: 'top-center' });
    this.initFlowbite(modal);
    this.modal = modal;
  }

  cleanupEventHandlers() {
    document.removeEventListener('turbo:before-stream-render', this.turboBeforeStreamRender);
  }

  cleanupFrameEvent(element) {
    if (!element)
      element = this.turboFrameTarget;
    element.removeEventListener('turbo:fetch-request-error', this.handleTurboFrameFetchRequestError);
    element.removeEventListener('turbo:frame-load', this.initHandleElements);
    element.removeEventListener('turbo:before-fetch-response', this.handleBeforeFetchResponse);
    element.removeEventListener('turbo:before-fetch-request', this.awaitHandleBeforeFetchRequest);
  }

  showBsModal() {
    if (this.modal.forceClose)
      this.forceClose();
  }

  hideBsModal(ev) {
    if (!document.closingModal)
      document.closingModal = this.turboFrameTargetId;
    else if (document.closingModal !== this.turboFrameTargetId) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      return;
    }

    if (this.abortController) {
      this.abortController.abort(this.abortReason);
      console.log('Abort signal sent:', this.abortController, this.turboFrameTargetId);
      this.removeDisabledAttribute();
      this.abortController = null;
    }

    this.modal.forceClose = false;
    this.waitForModalReallyHide(() => {
      delete document.closingModal;
    });
  }

  waitForModalReallyHide(cb, currentTry = 0, maxRetry = 20) {
    if (currentTry >= maxRetry) {
      if (cb) cb();
      return;
    }

    if (this.element.getAttribute('aria-hidden') !== 'true') {
      this.constructor.sleep(50).then(() => {
        this.waitForModalReallyHide(cb, currentTry + 1);
      });
    } else {
      if (cb) cb();
    }
  }

  removeDisabledAttribute() {
    if (this.triggerElement?.getAttribute('data-disable-on-reponse') !== 'true') {
      this.triggerElement?.removeAttribute('disabled');
      this.triggerElement?.classList.remove('disabled', 'opacity-40', 'cursor-not-allowed');
    }
  }

  hideErrorContainers() {
    this.errorContainerTargets.forEach((container) => {
      container.classList.add('hidden');
    });
  }

  showErrorContainers() {
    this.errorContainerTargets.forEach((container) => {
      container.classList.remove('hidden');
    });
  }

  awaitHandleBeforeFetchRequest(event) {
    if (event.target.tagName === 'FORM') {
      const frameId = this.triggerElement?.getAttribute('data-turbo-frame');
      if (frameId && frameId !== event.target.getAttribute('data-turbo-frame')) return;
      else {
        const frameId = event.target.getAttribute('data-turbo-frame');
        if (frameId && frameId !== this.turboFrameTargetId) {
          // console.log('awaitHandleBeforeFetchRequest: not the target', frameId, this.turboFrameTargetId);
          return;
        }
      }
    }
    this.turboFrameTarget.removeAttribute('complete');

    this.hideErrorContainers();
    const { fetchOptions } = event.detail;
    this.abortController = new AbortController();
    fetchOptions.signal = this.abortController.signal;

    if (event.target.tagName === 'FORM') {
      this.constructor.sleep(180).then(() => {
        this.handleBeforeFetchRequest(event);
      });
    } else
      this.handleBeforeFetchRequest(event);
  }

  handleBeforeFetchRequest(event) {
    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true') {
      this.noNeedOpen = true;
      return;
    }

    this.open(event, this.turboFrameTarget.getAttribute('complete') == null);
  }

  waitForFrameReplaced(selector, callback, currentTry = 0, maxRetry = 20) {
    if (currentTry >= maxRetry) {
      if (callback) callback(false);
      return;
    }

    const target = document.querySelector(selector);
    if (target) {
      this.constructor.sleep(100).then(() => {
        this.waitForFrameReplaced(selector, callback, currentTry + 1);
      });
    } else {
      this.constructor.sleep(100).then(() => {
        if (callback) callback(true);
      });
    }
  }

  forceClose(event) {
    if (this.modal.forceClose) {
      this.close(event);

      this.constructor.sleep(50).then(() => {
        this.forceClose(event);
      });
    }
  }

  handleByTarget(event) {
    if (event.target.getAttribute('data-turbo-frame') === this.turboFrameTargetId) {
      const fetchResponse = event.detail.fetchResponse.response.clone();
      if (fetchResponse.status !== 200) {
        event.stopPropagation();
        event.preventDefault();

        this.parseContentAndDisplayError(fetchResponse);
        this.open(event);
        return;
      }

      this.modal.forceClose = true;
      if (this.isModalOpen)
        this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });

      return;
    }

    const turboFrame = event.target.closest('turbo-frame');
    if (turboFrame && turboFrame?.id !== this.turboFrameTargetId) {
      const fetchResponse = event.detail.fetchResponse.response.clone();
      if (fetchResponse.status !== 200) {
        event.preventDefault();

        this.parseContentAndDisplayError(fetchResponse);
        this.open(event);
        return;
      }
      
      this.modal.forceClose = true;
      if (this.isModalOpen)
        this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });

      return;
    }

    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      this.parseContentAndDisplayError(fetchResponse);
      this.open(event);
      return;
    } else {
      const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
      if (fetchResponseIsStream)
        return;

      fetchResponse.text().then((text) => {
        this.setFrameContent(text);
        const turboFrames = this.turboFrameTarget.querySelectorAll('turbo-frame');
        turboFrames.forEach((frame) => {
          frame.removeAttribute('id');
        });
        this.initHandleElements(this.turboFrameTarget);
      }).catch((e) => {
        console.log('Error parsing the response HTML:', e);
      });
    }
  }

  handleFormResponse(event) {
    const handleModal = event.target.getAttribute('data-turbo-frame');
    if (handleModal !== this.turboFrameTargetId)
      return;

    if (!event.processing)
      event.processing = true;
    else {
      // console.log('handleBeforeFetchResponse: already processed', handleModal, this.turboFrameTargetId);
      return;
    }

    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      this.parseContentAndDisplayError(fetchResponse);
      this.open(event);
      return;
    }

    const fetchResponseIsStream = fetchResponse.headers.get('Content-Type').includes('text/vnd.turbo-stream.html');
    if (fetchResponseIsStream) {
      if (this.noNeedOpen) {
        this.noNeedOpen = false;
        return;
      }
    }

    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true') {
      this.open(event);
    }
  }

  handleTurboFrameResponse(event) {
    this.removeDisabledAttribute();
    const fetchResponse = event.detail.fetchResponse.response.clone();
    if (fetchResponse.status !== 200) {
      event.preventDefault();

      this.parseContentAndDisplayError(fetchResponse);
      this.open(event);
      return;
    }

    if (this.triggerElement?.getAttribute('data-show-modal-when-response') === 'true' ||
      event.target.getAttribute('data-show-modal-when-response') === 'true')
      this.open(event);
  }

  handleBeforeFetchResponse(event) {
    this.abortController = null;

    if (event.target.tagName === 'TURBO-FRAME')
      this.handleTurboFrameResponse(event);
    else if (event.target.tagName === 'FORM') {
      if (event.target.getAttribute('data-handle-by-target') === 'true')
        this.handleByTarget(event);
      else
        this.handleFormResponse(event);
    }
  }

  handleTurboClickEvent(event) {
    this.triggerElement = event.target;

    if (this.triggerElement.getAttribute('data-disable-on-request') === 'true') {
      this.triggerElement.setAttribute('disabled', 'disabled');
      this.triggerElement.classList.add('disabled', 'opacity-40', 'cursor-not-allowed');
    }
  }

  handleTurboSubmitStartEvent(event) {
    this.triggerElement = event.detail.formSubmission.submitter;
  }

  initHandleElements(event) {
    let parentNode = (event && event.target) ? event.target : (event && event.tagName ? event : null);
    if (!parentNode)
      parentNode = document;

    const elements = parentNode.querySelectorAll('[data-turbo-frame]');
    elements.forEach((element) => {
      const frameId = element.getAttribute('data-turbo-frame');
      if (!frameId)
        return;

      const modal = document.querySelector(`[data-controller="modals"].${frameId}`);
      const controller = this.application.getControllerForElementAndIdentifier(modal, 'modals');

      if (!controller)
        return;

      if (element.classList.contains('event-added')) 
        return;

      element.classList.add('event-added');

      if (element.tagName === 'FORM') {
        element.addEventListener('turbo:submit-start', controller.handleTurboSubmitStartEvent);
        element.addEventListener('turbo:before-fetch-request', controller.awaitHandleBeforeFetchRequest);
        element.addEventListener('turbo:before-fetch-response', controller.handleBeforeFetchResponse);
        element.addEventListener('turbo:fetch-request-error', controller.handleFormFetchRequestError);
      }
      else
        element.addEventListener('turbo:click', controller.handleTurboClickEvent);
    });
  }

  handleTurboFrameFetchRequestError(event) {
    console.log('turbo:fetch-request-error on turbo-frame fired', event);
    event.preventDefault();

    if (event.detail.error === this.abortReason)
      return;

    this.modal.forceClose = true;
    this.constructor.sleep(500).then(() => {
      this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });
    });
  }

  handleFormFetchRequestError(event) {
    console.log('turbo:fetch-request-error on form fired', event);
    event.preventDefault();
    
    if (event.detail.error === this.abortReason)
      return;

    this.modal.forceClose = true;
    this.constructor.sleep(500).then(() => {
      this.close(event);
      this.constructor.sleep(800).then(() => {
        this.modal.forceClose = false;
      });
    });
  }

  initFrameEvent(element) {
    if (!element)
      element = this.turboFrameTarget;

    if (element.classList.contains('event-added'))
      return;

    element.classList.add('event-added');
    element.addEventListener('turbo:fetch-request-error', this.handleTurboFrameFetchRequestError);
    element.addEventListener('turbo:frame-load', this.initHandleElements);
    element.addEventListener('turbo:before-fetch-response', this.handleBeforeFetchResponse);
    element.addEventListener('turbo:before-fetch-request', this.awaitHandleBeforeFetchRequest);
  }

  initRetry() {
    this.errorContainerTargets.forEach((container) => {
      const retryButton = container.querySelector('.retry-button');
      retryButton.addEventListener('click', this.retryRequest);
    });
  }

  retryRequest() {
    this.setLoading();
    this.triggerElement.click();
  }

  parseContentAndDisplayError(response) {
    const contentType = response.headers.get('Content-Type');
    if (!contentType) {
      this.setFrameContent('Error: Unable to process your request.');
      return;
    }

    if (contentType.includes('text/html')) {
      response.text()
      .then(this.displayErrorFromHtml.bind(this))
      .catch(() => this.setFrameContent('Error: Unable to process your request.'));
    } else if (contentType.includes('application/json')) {
      response.json().then(this.displayErrorFromJson.bind(this));
    }
  }

  /*
  reinitFrameContent(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const turboStreams = doc.querySelectorAll('turbo-stream');
      turboStreams.forEach((frame) => {
        const frameId = frame.getAttribute('target');
        const currentFrame = document.getElementById(frameId);
        if (currentFrame) {
          if (frameId === this.turboFrameTargetId && !currentFrame.getAttribute('data-modal-target'))
            currentFrame.setAttribute('data-modal-target', 'turboFrame');
          this.initHandleElements(currentFrame);
          this.initFrameEvent(currentFrame);
        }
      });
    } catch (e) {
      console.log('Error parsing the frame HTML:', e);
    }
  }
  */

  displayErrorFromHtml(html) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const errorTitle = doc.querySelector('title') ? doc.querySelector('title').textContent : 'Unknown Error';
      const errorContent = this.extractHtmlErrorContent(doc.body);

      this.setFrameContent(`
      <div class='p-4 mb-4 text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800'>
      Error:<br/>${errorTitle}<br/>Details:<br/>${errorContent}
      </div>`);
    } catch (e) {
      console.log('Error parsing the response HTML:', e);
      this.setFrameContent('Error: Unable to process your request.');
    }

    this.showErrorContainers();
  }

  extractHtmlErrorContent(body) {
    const header = body.querySelector('header');
    const header2 = body.querySelector('#container > h2');
    let bodyFrame = body.querySelector('#frame-source-0-0');
    const exceptionFrame = body.querySelector('.exception-message') || body.querySelector('#container > pre');
    
    // Add 'table' and 'table-striped' classes to any table inside bodyFrame
    if (bodyFrame) {
      const table = bodyFrame.querySelector('table');
      if (table) {
        table.classList.add('table', 'table-striped');
      }
    } else {
      bodyFrame = body.querySelector('.rails-default-error-page');
    }

    return `
      <div class='error-header mb-2'>${header ? header.innerText : ''}</div>
      <div class='error-header2 mb-2'>${header2 ? header2.innerText : ''}</div>
      <div class='error-exception'>${exceptionFrame ? exceptionFrame.innerHTML : ''}</div>
      <div class='error-body'>${bodyFrame ? bodyFrame.innerHTML : ''}</div>
    `;
  }

  displayErrorFromJson(json) {
    const errorHeader = json.error || 'An unexpected error occurred.';
    this.setFrameContent(`
      <div class='error-header mb-2'>${errorHeader}</div>
      <div class='p-4 mb-4 text-red-800 border border-red-300 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800'>JSON Error:<br/>${JSON.stringify(json, null, 2)}</div>
    `);
    this.showErrorContainers();
  }

  setFrameContent(content) {
    this.turboFrameTarget.innerHTML = content;
  }

  setLoading() {
    this.setFrameContent(`
    <div class="text-center">
      <div role="status">
        <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span class="sr-only">Loading...</span>
      </div>
    </div>
    `);
  }

  open(event, setLoading = true) {
    if (!this.isModalOpen) {
      if (setLoading)
        this.setLoading();
      this.modal.show();
    }
  }

  close(event) {
    if (this.modal.isTransitioning)
      return;

    this.modal.hide();
  }

  getFrameId(event) {
    if (event.target.tagName === 'TURBO-FRAME')
      return event.target.id;
    else
      return event.target.getAttribute('data-turbo-frame');
  }
}
