import {UploadFormDemo} from '@/components/demo/upload-form-demo'
import {BottomNav} from '@/components/bottom-nav'

export default function DemoUploadPage() {
    return (
        <>
            <div className="max-w-md mx-auto px-6 pt-10 pb-32">
                <UploadFormDemo/>
            </div>
            <BottomNav slug="demo" enableFindSeat={true} enablePhotoUpload={true}/>
        </>
    )
}