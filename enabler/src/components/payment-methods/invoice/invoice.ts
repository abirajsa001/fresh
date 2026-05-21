 import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
} from '../../../payment-enabler/payment-enabler';
import { BaseComponent } from "../../base";
import styles from '../../../style/style.module.scss';
import buttonStyles from "../../../style/button.module.scss";
import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/novalnet-payment.dto";
import { BaseOptions } from "../../../payment-enabler/novalnet-payment-enabler";

export class InvoiceBuilder implements PaymentComponentBuilder {
  public componentHasSubmit = true;
  constructor(private baseOptions: BaseOptions) {}

  build(config: ComponentOptions): PaymentComponent {
    return new Invoice(this.baseOptions, config);
  }
}

export class Invoice extends BaseComponent {
  private showPayButton: boolean;

  constructor(baseOptions: BaseOptions, componentOptions: ComponentOptions) {
    super(PaymentMethod.invoice, baseOptions, componentOptions);
    this.showPayButton = componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {
    document
      .querySelector(selector)
      .insertAdjacentHTML("afterbegin", this._getTemplate());

      setTimeout(() => {
        const labels = document.querySelectorAll('label');
        labels.forEach((label) => {
          const text = label.textContent?.trim().toLowerCase();
          if (text?.includes('invoice')) {
            label.textContent = 'Invoice';
          }
        });
      }, 300);

    if (this.showPayButton) {
      document
        .querySelector("#invoiceForm-paymentButton")
        .addEventListener("click", (e) => {
          e.preventDefault();
          this.submit();
        });
    }
  }

  async submit() {
    // here we would call the SDK to submit the payment
    this.sdk.init({ environment: this.environment });
    const pathLocale = window.location.pathname.split("/")[1];
    const url = new URL(window.location.href);
    const baseSiteUrl = url.origin;

    try {
      const requestData: PaymentRequestSchemaDTO = {
        paymentMethod: {
          type: this.paymentMethod,
        },
        paymentOutcome: PaymentOutcome.AUTHORIZED,
      };
     
      const response = await fetch(this.processorUrl + "/directPayment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.sessionId,
        },
        body: JSON.stringify(requestData),
      });
      const data = await response.json();
      if (data.paymentReference) {
        this.onComplete &&
          this.onComplete({
            isSuccess: true,
            paymentReference: data.paymentReference,
          });
      } else {
        this.onError("Some error occurred. Please try again.");
      }

    } catch (e) {
      this.onError("Some error occurred. Please try again.");
    }
  }

  private _getTemplate() {

    const locale = document.documentElement.lang || "en";
  
    const invoiceLabel =
      locale.startsWith("de")
        ? "Rechnung"
        : "Invoice";
  
    const description =
      locale.startsWith("de")
        ? "Bezahlen Sie bequem per Rechnung und überweisen Sie den Betrag innerhalb der angegebenen Frist."
        : "Pay easily with Invoice and transfer the shopping amount within the specified date.";
  
    return `
      <div class="${styles.wrapper}">
  
        <label class="${styles.label}">
          <input
            type="radio"
            name="novalnet-payment-method"
            checked
          />
          ${invoiceLabel}
        </label>
  
        <p>${description}</p>
  
        ${
          this.showPayButton
            ? `
              <button
                class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}"
                id="invoiceForm-paymentButton"
              >
                ${locale.startsWith("de") ? "Bezahlen" : "Pay"}
              </button>
            `
            : ""
        }
  
      </div>
    `;
  }
}
